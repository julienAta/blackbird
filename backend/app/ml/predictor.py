# app/ml/predictor.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb
from typing import List, Dict, Tuple
import joblib
from datetime import datetime
import os
from pathlib import Path

class QuickTokenPredictor:
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.model = None
        self.scaler = StandardScaler()
        self.success_patterns = {}
        self.feature_names = None
        self.training_history = []
        
        Path(model_dir).mkdir(parents=True, exist_ok=True)
        self.load_latest()
    
    def load_latest(self) -> bool:
        try:
            models = list(Path(self.model_dir).glob("quick_pattern_model_*.joblib"))
            if not models:
                print("No existing models found")
                return False
                
            latest_model = max(models, key=os.path.getctime)
            return self.load(str(latest_model))
        except Exception as e:
            print(f"Error loading latest model: {str(e)}")
            return False

    def extract_quick_features(self, trades_df: pd.DataFrame, token_data: dict) -> dict:
        try:
            features = {
                'initial_buy_sol': float(token_data['initialBuySol']),
                'initial_buy_percent': float(token_data['initialBuyPercent']),
                'initial_liquidity': float(token_data['liquidity']),
                
                'trades_30s': 0, 'trades_1min': 0, 'trades_2min': 0, 'trades_5min': 0,
                'buy_ratio_30s': 0, 'buy_ratio_1min': 0, 'buy_ratio_2min': 0, 'buy_ratio_5min': 0,
                'mcap_growth_30s': 0, 'mcap_growth_1min': 0, 'mcap_growth_2min': 0, 'mcap_growth_5min': 0,
                'unique_traders_30s': 0, 'unique_traders_1min': 0, 'unique_traders_2min': 0, 'unique_traders_5min': 0,
                'buy_pressure_30s': 0, 'buy_pressure_1min': 0, 'buy_pressure_2min': 0, 'buy_pressure_5min': 0,
                'holders_30s': 0, 'holders_1min': 0, 'holders_2min': 0, 'holders_5min': 0,
                'holders_growth_30s': 0, 'holders_growth_1min': 0, 'holders_growth_2min': 0, 'holders_growth_5min': 0,
            }
            
            if len(trades_df) == 0:
                return features
                
            trades_df['timestamp'] = pd.to_numeric(trades_df['timestamp'])
            trades_df = trades_df.sort_values('timestamp')
            start_time = trades_df['timestamp'].min()
            initial_holders = trades_df.iloc[0]['holdersCount']

            # Calculate actual trade volumes
            trades_df['trade_volume_sol'] = trades_df.apply(lambda row: 
                abs(row['vSolInBondingCurve'] - trades_df[trades_df['timestamp'] < row['timestamp']]['vSolInBondingCurve'].iloc[-1] 
                    if not trades_df[trades_df['timestamp'] < row['timestamp']].empty 
                    else 0)
                if row.name > 0 else row['vSolInBondingCurve'],
                axis=1
            )
            
            # Process time windows
            for seconds, suffix in [(30, '30s'), (60, '1min'), (120, '2min'), (300, '5min')]:
                window = trades_df[
                    trades_df['timestamp'] <= start_time + (seconds * 1000)
                ]
                
                if len(window) == 0:
                    continue
                    
                features[f'trades_{suffix}'] = len(window)
                features[f'unique_traders_{suffix}'] = window['traderPublicKey'].nunique()
                
                # Holder metrics
                features[f'holders_{suffix}'] = window.iloc[-1]['holdersCount']
                holders_growth = ((window.iloc[-1]['holdersCount'] - initial_holders) / initial_holders * 100) if initial_holders > 0 else 0
                features[f'holders_growth_{suffix}'] = holders_growth
                
                # Calculate volume metrics using actual trade volumes
                buys = window[window['txType'] == 'buy']
                features[f'buy_ratio_{suffix}'] = len(buys) / len(window) if len(window) > 0 else 0
                
                buy_volume = buys['trade_volume_sol'].sum()
                total_volume = window['trade_volume_sol'].sum()
                features[f'buy_pressure_{suffix}'] = buy_volume / total_volume if total_volume > 0 else 0
                
                if len(window) > 1:
                    start_mcap = window.iloc[0]['marketCapSol']
                    end_mcap = window.iloc[-1]['marketCapSol']
                    features[f'mcap_growth_{suffix}'] = ((end_mcap - start_mcap) / start_mcap * 100) if start_mcap > 0 else 0
                    
                print(f"\nWindow {suffix}:")
                print(f"Trades in window: {len(window)}")
                print(f"Volume in window: {total_volume:.4f} SOL")
                print(f"Buy Volume: {buy_volume:.4f} SOL")
                print(f"Current holders: {features[f'holders_{suffix}']}")
                print(f"Holders growth: {features[f'holders_growth_{suffix}']}%")
                print(f"Buy ratio: {features[f'buy_ratio_{suffix}']:.2f}")
                print(f"Growth: {features[f'mcap_growth_{suffix}']:.2f}%")
            
            return features
            
        except Exception as e:
            print(f"Error extracting features: {str(e)}")
            print(f"Trades DataFrame columns: {trades_df.columns.tolist()}")
            raise
            
        except Exception as e:
            print(f"Error extracting features: {str(e)}")
            print(f"Trades DataFrame columns: {trades_df.columns.tolist()}")
            raise
    def train(self, trades_df: pd.DataFrame, tokens_df: pd.DataFrame, success_mcap: float = 400):
        """Train model to detect quick success patterns while avoiding bad patterns"""
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
            raise ValueError("No matching mints found between trades and tokens")
        
        features_list = []
        labels = []
        success_patterns = []
        avoid_patterns = []
        processed_tokens = 0
        
        rugpull_count = 0
        holder_dump_count = 0
        no_growth_count = 0
        
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
                if not all(v == 0 for v in features.values()):
                    # Extract performance metrics
                    initial_mcap = token_trades.iloc[0]['marketCapSol']
                    max_mcap = token_trades['marketCapSol'].max()
                    final_mcap = token_trades.iloc[-1]['marketCapSol']
                    max_growth = ((max_mcap - initial_mcap) / initial_mcap) * 100
                    holders_peak = token_trades['holdersCount'].max()
                    holders_final = token_trades.iloc[-1]['holdersCount']
                    holder_retention = holders_final / holders_peak if holders_peak > 0 else 0
                    drop_from_ath = ((max_mcap - final_mcap) / max_mcap) * 100

                    # Define negative patterns
                    is_rugpull = drop_from_ath >= 60  # Lost 60% from initial
                    is_holder_dump = (holder_retention < 0.5)  # Lost 50% of peak holders
                    is_no_growth = (max_growth < 30)  # Never grew significantly
                    
                    if is_rugpull:
                        rugpull_count += 1
                        avoid_patterns.append(('rugpull', features))
                    if is_holder_dump:
                        holder_dump_count += 1
                        avoid_patterns.append(('holder_dump', features))
                    if is_no_growth:
                        no_growth_count += 1
                        avoid_patterns.append(('no_growth', features))
                    
                    # Define success criteria
                    is_success = (
                        token['marketCap'] >= success_mcap and  # Reached target mcap
                        not is_rugpull and                      # Didn't crash completely
                        not is_holder_dump and                  # Retained holders
                        max_growth >= 100                       # At least doubled
                    )
                    
                    features_list.append(features)
                    labels.append(is_success)
                    processed_tokens += 1
                    
                    if is_success:
                        success_patterns.append(features)
                        
                    if processed_tokens % 10 == 0:
                        print(f"\nAnalyzed {processed_tokens} tokens")
                        print(f"Success: {sum(labels)}, Failed: {len(labels) - sum(labels)}")
                        print(f"Patterns to avoid found:")
                        print(f"- Rugpulls: {rugpull_count}")
                        print(f"- Holder dumps: {holder_dump_count}")
                        print(f"- No growth: {no_growth_count}")
                        
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
        print(f"Successful tokens: {success_count} ({(success_count/len(labels)*100):.2f}%)")
        print(f"Failed tokens: {len(labels) - success_count} ({((len(labels) - success_count)/len(labels)*100):.2f}%)")
        print("\nFailure Categories:")
        print(f"- Rugpulls: {rugpull_count}")
        print(f"- Holder dumps: {holder_dump_count}")
        print(f"- No growth: {no_growth_count}")
        
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
        
        training_record = {
            'timestamp': datetime.now().isoformat(),
            'trades_count': len(trades_df),
            'tokens_count': len(tokens_df),
            'success_count': success_count,
            'rugpull_count': rugpull_count,
            'holder_dump_count': holder_dump_count,
            'no_growth_count': no_growth_count,
            'success_rate': (success_count/len(labels) * 100) if labels else 0,
            'top_features': importance['feature'].tolist()[:5],
            'success_patterns': len(success_patterns),
            'avoid_patterns': len(avoid_patterns)
        }
        
        self.training_history.append(training_record)
        self.save()
        
        print("\nTraining History:")
        print(f"Total training sessions: {len(self.training_history)}")
        if self.training_history:
            latest = self.training_history[-1]
            print(f"Latest session stats:")
            print(f"- Date: {latest['timestamp']}")
            print(f"- Success rate: {latest['success_rate']:.2f}%")
            print(f"- Rugpulls avoided: {latest['rugpull_count']}")
            print(f"- Holder dumps avoided: {latest['holder_dump_count']}")
            print(f"- No growth avoided: {latest['no_growth_count']}")
            print(f"- Top features: {', '.join(latest['top_features'])}")
        
        return self
    
    def save(self, name: str = None):
        """Save model and training state"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = name or f"quick_pattern_model_{timestamp}.joblib"
            path = os.path.join(self.model_dir, filename)
            
            # Ensure the directory exists
            os.makedirs(self.model_dir, exist_ok=True)
            
            # Validate path
            abs_path = os.path.abspath(path)
            if not abs_path.startswith(os.path.abspath(self.model_dir)):
                raise ValueError("Invalid save path")
                
            state = {
                'model': self.model,
                'scaler': self.scaler,
                'success_patterns': self.success_patterns,
                'feature_names': self.feature_names,
                'training_history': self.training_history,
                'timestamp': timestamp
            }
            
            # Save to a temporary file first
            temp_path = path + '.tmp'
            joblib.dump(state, temp_path)
            
            # If successful, rename to final path
            os.replace(temp_path, path)
            
            print(f"\nModel saved to: {path}")
            return path
            
        except Exception as e:
            print(f"Error saving model: {str(e)}")
            print("Error type:", type(e))
            print("Traceback:", traceback.format_exc())
            raise
    def predict(self, trades: List[Dict], token_data: Dict) -> Tuple[bool, float, Dict]:
        try:
            # Debug: Check if model is loaded
            if not self.model:
                print("No model loaded, using temporary scoring logic")
                # Temporary scoring logic until model is trained
                trades_df = pd.DataFrame(trades)
                features = self.extract_quick_features(trades_df, token_data)
                
                # Calculate a basic score based on early trading patterns
                score = 0.0
                num_trades = features['trades_1min']
                buy_ratio = features['buy_ratio_1min']
                growth = features['mcap_growth_1min']
                
                # Score based on number of trades in first minute
                if num_trades >= 5:
                    score += 0.3
                elif num_trades >= 3:
                    score += 0.2
                    
                # Score based on buy ratio
                if buy_ratio >= 0.7:
                    score += 0.3
                elif buy_ratio >= 0.5:
                    score += 0.2
                    
                # Score based on market cap growth
                if growth >= 50:  # 50% growth
                    score += 0.4
                elif growth >= 20:
                    score += 0.2
                    
                print(f"Scoring Details:")
                print(f"- Trades (1min): {num_trades}")
                print(f"- Buy Ratio (1min): {buy_ratio:.2f}")
                print(f"- Growth (1min): {growth:.2f}%")
                print(f"- Final Score: {score:.2f}")
                
                analysis = {
                    'early_signs': {
                        'num_trades': num_trades,
                        'buy_ratio': buy_ratio,
                        'growth_rate': growth
                    },
                    'feature_values': features
                }
                
                return score >= 0.7, score, analysis
                
            # Normal model-based prediction
            trades_df = pd.DataFrame(trades)
            features = self.extract_quick_features(trades_df, token_data)
            
            # Debug: Print features
            print("\nExtracted Features:")
            for k, v in features.items():
                print(f"{k}: {v}")
                
            X = pd.DataFrame([features])
            
            if self.feature_names:
                missing_features = set(self.feature_names) - set(X.columns)
                for feature in missing_features:
                    X[feature] = 0
                X = X[self.feature_names]
            
            # Debug: Print scaled features
            X_scaled = self.scaler.transform(X)
            print("\nScaled Features shape:", X_scaled.shape)
            
            probability = float(self.model.predict(X_scaled)[0])
            prediction = probability > 0.7
            
            print(f"\nPrediction Results:")
            print(f"Probability: {probability:.3f}")
            print(f"Prediction: {prediction}")
            
            analysis = {
                'probability': probability,
                'early_signs': {
                    'buy_pressure': features['buy_pressure_1min'],
                    'growth_rate': features['mcap_growth_1min'],
                    'trader_interest': features['unique_traders_1min']
                },
                'feature_values': features
            }
            
            return prediction, probability, analysis
            
        except Exception as e:
            print(f"Prediction error: {str(e)}")
            print(f"Trades data shape: {pd.DataFrame(trades).shape}")
            print(f"Token data: {token_data}")
            raise