// app/actions/token.ts
export async function fetchSolPrice() {
  const response = await fetch("https://price.jup.ag/v4/price?ids=SOL");
  const data = await response.json();
  return data.data.SOL.price;
}
