# app/ml/predictor.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, precision_score, recall_score
import lightgbm as lgb
from typing import List, Dict, Tuple
import joblib
from datetime import datetime

class QuickTokenPredictor:
    def train(self, trades_df: pd.DataFrame, tokens_df: pd.DataFrame, success_mcap: float = 400):
        """Train model to detect quick success patterns"""
        print("\nProcessing trading data...")
        print(f"Initial trades shape: {trades_df.shape}")
        print(f"Initial tokens shape: {tokens_df.shape}")
        
        # Convert timestamps to ensure they're numeric
        trades_df['timestamp'] = pd.to_numeric(trades_df['timestamp'], errors='coerce')
        
        # Sort all trades by timestamp
        trades_df = trades_df.sort_values('timestamp')
        
        # First, analyze data
        print("\nData Analysis:")
        print(f"Trades timestamp range: {trades_df['timestamp'].min()} to {trades_df['timestamp'].max()}")
        print(f"Trades columns: {trades_df.columns.tolist()}")
        print(f"Tokens columns: {tokens_df.columns.tolist()}")
        
        trade_mints = set(trades_df['mint'].unique())
        token_mints = set(tokens_df['mint'].unique())
        common_mints = trade_mints.intersection(token_mints)
        
        print(f"\nMint Analysis:")
        print(f"Unique mints in trades: {len(trade_mints)}")
        print(f"Unique mints in tokens: {len(token_mints)}")
        print(f"Matching mints: {len(common_mints)}")
        
        if len(common_mints) == 0:
            print("\nSample mints from trades:", list(trade_mints)[:5])
            print("Sample mints from tokens:", list(token_mints)[:5])
        
        features_list = []
        labels = []
        success_patterns = []
        processed_tokens = 0
        
        print("\nProcessing tokens...")
        for mint in common_mints:
            try:
                # Get token data
                token = tokens_df[tokens_df['mint'] == mint].iloc[0]
                token_trades = trades_df[trades_df['mint'] == mint]
                
                if len(token_trades) == 0:
                    continue
                
                # Extract features
                features = self.extract_quick_features(token_trades, token)
                
                # Verify features
                if not all(v == 0 for v in features.values()):  # Skip if all features are 0
                    features_list.append(features)
                    is_success = token['marketCap'] >= success_mcap
                    labels.append(is_success)
                    processed_tokens += 1
                    
                    if is_success:
                        success_patterns.append(features)
                
                if processed_tokens % 10 == 0:
                    print(f"Processed {processed_tokens} tokens...")
                
            except Exception as e:
                print(f"Error processing token {mint}:", str(e))
                continue
        
        print(f"\nFeature Extraction Results:")
        print(f"Total tokens processed: {processed_tokens}")
        print(f"Features extracted: {len(features_list)}")
        
        if len(features_list) == 0:
            raise ValueError("No valid features extracted. Please check data structure and matching.")
        
        X = pd.DataFrame(features_list)
        y = np.array(labels)
        
        print("\nFeature Names:", X.columns.tolist())
        print("Sample Features:")
        print(X.iloc[0] if len(X) > 0 else "No features")
        
        success_count = sum(labels)
        print(f"\nFinal Statistics:")
        print(f"Total tokens with features: {len(labels)}")
        print(f"Successful tokens: {success_count}")
        print(f"Success rate: {(success_count/len(labels)*100):.2f}%")
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        train_data = lgb.Dataset(X_scaled, label=y)
        
        params = {
            'objective': 'binary',
            'metric': 'auc',
            'learning_rate': 0.05,
            'num_leaves': 31,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'boost_from_average': True,
            'verbosity': -1
        }
        
        print("\nTraining model...")
        self.model = lgb.train(params, train_data, num_boost_round=100)
        
        # Save feature names
        self.feature_names = X.columns.tolist()
        
        # Print feature importance
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importance()
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Important Features:")
        print(importance.head(10))
        
        return self
        
    def extract_quick_features(self, trades_df: pd.DataFrame, token_data: dict) -> dict:
        """Extract features focusing on first minutes patterns"""
        try:
            features = {
                # Initial metrics
                'initial_buy_sol': float(token_data['initialBuySol']),
                'initial_buy_percent': float(token_data['initialBuyPercent']),
                'initial_liquidity': float(token_data['liquidity']),
                
                # Initialize time windows
                'trades_30s': 0, 'trades_1min': 0, 'trades_2min': 0, 'trades_5min': 0,
                'buy_ratio_30s': 0, 'buy_ratio_1min': 0, 'buy_ratio_2min': 0, 'buy_ratio_5min': 0,
                'mcap_growth_30s': 0, 'mcap_growth_1min': 0, 'mcap_growth_2min': 0, 'mcap_growth_5min': 0,
                'unique_traders_30s': 0, 'unique_traders_1min': 0, 'unique_traders_2min': 0, 'unique_traders_5min': 0,
                'buy_pressure_30s': 0, 'buy_pressure_1min': 0, 'buy_pressure_2min': 0, 'buy_pressure_5min': 0
            }
            
            if len(trades_df) == 0:
                return features
                
            # Ensure timestamp is numeric and sort
            trades_df['timestamp'] = pd.to_numeric(trades_df['timestamp'])
            trades_df = trades_df.sort_values('timestamp')
            
            start_time = trades_df['timestamp'].min()
            
            # Process time windows
            for seconds, suffix in [(30, '30s'), (60, '1min'), (120, '2min'), (300, '5min')]:
                window = trades_df[
                    trades_df['timestamp'] <= start_time + (seconds * 1000)
                ]
                
                if len(window) == 0:
                    continue
                
                features[f'trades_{suffix}'] = len(window)
                features[f'unique_traders_{suffix}'] = window['traderPublicKey'].nunique()
                
                buys = window[window['txType'] == 'buy']
                features[f'buy_ratio_{suffix}'] = len(buys) / len(window) if len(window) > 0 else 0
                
                buy_volume = buys['vSolInBondingCurve'].sum()
                total_volume = window['vSolInBondingCurve'].sum()
                features[f'buy_pressure_{suffix}'] = buy_volume / total_volume if total_volume > 0 else 0
                
                if len(window) > 1:
                    start_mcap = window.iloc[0]['marketCapSol']
                    end_mcap = window.iloc[-1]['marketCapSol']
                    features[f'mcap_growth_{suffix}'] = ((end_mcap - start_mcap) / start_mcap * 100) if start_mcap > 0 else 0
            
            return features
            
        except Exception as e:
            print(f"Error extracting features: {str(e)}")
            raise

    def predict(self, trades: List[Dict], token_data: Dict) -> Tuple[bool, float, Dict]:
        """Predict token's potential with detailed analysis"""
        if not self.model:
            return False, 0.0, {}
            
        trades_df = pd.DataFrame(trades)
        features = self.extract_quick_features(trades_df, token_data)
        
        X = pd.DataFrame([features])
        X_scaled = self.scaler.transform(X)
        
        # Get prediction and probability
        probability = self.model.predict(X_scaled)[0]
        prediction = probability > 0.7
        
        # Compare with success patterns
        pattern_match = {}
        if self.success_patterns:
            for key, typical_value in self.success_patterns.items():
                current_value = features.get(key, 0)
                if typical_value != 0:
                    match_percent = (current_value / typical_value) * 100
                    pattern_match[key] = match_percent
        
        analysis = {
            'probability': probability,
            'early_signs': {
                'buy_pressure': features['buy_pressure_1min'],
                'growth_rate': features['mcap_growth_1min'],
                'trader_interest': features['unique_traders_1min']
            },
            'pattern_match': pattern_match
        }
        
        return prediction, probability, analysis

    def save(self, path: str = "models"):
        """Save model and patterns"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        state = {
            'model': self.model,
            'scaler': self.scaler,
            'success_patterns': self.success_patterns
        }
        joblib.dump(state, f"{path}/quick_pattern_model_{timestamp}.joblib")

    def load(self, path: str):
        """Load model and patterns"""
        state = joblib.load(path)
        self.model = state['model']
        self.scaler = state['scaler']
        self.success_patterns = state['success_patterns']