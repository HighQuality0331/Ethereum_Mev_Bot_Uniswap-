import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

// Set up WebSocket connection
const provider = new ethers.WebSocketProvider("wss://api.mainnet.abs.xyz/ws");

// Listen for pending transactions
provider.on("pending", async (txHash) => {
  try {
    const pendingTx = await provider.getTransaction(txHash);
    if (pendingTx) {
      console.log(pendingTx);
    }
  } catch (error) {
    console.error(`Error fetching transaction ${txHash}:`, error);
  }
});
