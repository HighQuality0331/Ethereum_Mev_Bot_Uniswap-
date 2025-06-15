import { WebSocketProvider, Interface } from "ethers";

// Set up WebSocket connection
const provider = new WebSocketProvider("wss://eth.llamarpc.com");

// Uniswap V4 Router address and ABI (simplified for parsing)
const UNISWAP_V4_ROUTER = "0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af"; // Mainnet
const UNISWAP_V4_ABI = [
  "function execute(bytes commands, bytes[] inputs, uint256 deadline)",
];

const iface = new Interface(UNISWAP_V4_ABI);

provider.on("pending", async (txHash) => {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx || !tx.to) return;

    if (tx.to.toLowerCase() !== UNISWAP_V4_ROUTER.toLowerCase()) return;

    const parsed = iface.parseTransaction({
      data: tx.data,
      value: tx.value,
    });
    console.log(
      "-----------------------------------------------------------------",
      parsed,
      "================================================================"
    );
    console.log("\n🚀 Pending Uniswap V4 Swap Detected:");
    console.log("🔗 Tx Hash:", tx.hash);
    console.log("👤 From:", tx.from);
    console.log("📥 Method:", parsed?.name);
    if (parsed) {
      console.log("===time===", new Date());
      const [commands, inputs, deadline] = parsed?.args;
      console.log("🧱 Commands (hex):", commands);
      console.log("🧩 Inputs:");
      inputs.forEach((input: string, index: number) => {
        console.log(`   [${index}] ${input}`);
      });
      console.log("⏰ Deadline:", deadline.toString());
    }
  } catch (err) {
    // Ignore parse errors (non-matching transactions)
  }
});
