import { WebSocketProvider, Interface, ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();
// Set up WebSocket connection
// const provider = new WebSocketProvider("wss://ethereum-rpc.publicnode.com");
const provider = new WebSocketProvider(
  "wss://go.getblock.io/d50f7214d0654bc98dc58c30f86b578b"
);
// const provider = new WebSocketProvider("https://eth.llamarpc.com");

// Uniswap V2 Router address and ABI
const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Mainnet
const UNISWAP_V2_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)",
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline)",
  "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] path, address to, uint deadline)",
  "function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] path, address to, uint deadline)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)",
  "function swapETHForExactTokens(uint amountOut, address[] path, address to, uint deadline)",
];
const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"; // Mainnet
const UNISWAP_V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
];

const iface = new Interface(UNISWAP_V2_ABI);

let parsedData: { parsed: any; tx: any }[] = [];

provider.on("pending", async (txHash) => {
  try {
    const pendingTx = await provider.getTransaction(txHash);
    if (!pendingTx || !pendingTx.to) return;

    if (pendingTx.to.toLowerCase() !== UNISWAP_V2_ROUTER.toLowerCase()) return;

    const parsed = iface.parseTransaction({
      data: pendingTx.data,
      value: pendingTx.value,
    });

    parsedData.push({ parsed, tx: pendingTx });

    console.log("===time===", new Date());
    console.log("\n🚀 Pending Uniswap V2 Swap Detected:");
    console.log("🔗 Tx Hash:", pendingTx.hash);
    console.log("👤 From:", pendingTx.from);
    console.log("📥 Method:", parsed?.name);

    const args = parsed?.args;
    switch (parsed?.name) {
      case "swapExactTokensForTokens":
      case "swapExactTokensForETH":
        console.log("💰 Amount In:", args?.amountIn.toString());
        console.log("💸 Min Amount Out:", args?.amountOutMin.toString());
        break;
      case "swapExactETHForTokens":
        console.log(
          "💰 Amount In (ETH):",
          (Number(pendingTx.value) / 1000000000000000000)?.toString()
        );
        console.log(
          "💸 Min Amount Out:",
          (Number(args?.amountOutMin) / 1000000000000000000).toString()
        );
        break;
      case "swapTokensForExactTokens":
      case "swapTokensForExactETH":
        console.log("🎯 Amount Out:", args?.amountOut.toString());
        console.log("💰 Max Amount In:", args?.amountInMax.toString());
        break;
      case "swapETHForExactTokens":
        console.log(
          "🎯 Amount Out:",
          (Number(args?.amountOut) / 1000000000000000000).toString()
        );
        console.log(
          "💰 Max ETH In:",
          (Number(pendingTx.value) / 1000000000000000000)?.toString()
        );
        break;
    }

    console.log("🛣 Path:", args?.path.join(" → "));
    console.log("📬 Recipient:", args?.to);
    console.log("⏰ Deadline:", args?.deadline.toString());

    try {
      const factory = new ethers.Contract(
        UNISWAP_V2_FACTORY,
        UNISWAP_V2_FACTORY_ABI,
        provider
      );
      if (args?.path && args.path.length >= 2) {
        const tokenA = args.path[0];
        const tokenB = args.path[1];
        const pairAddress = await factory.getPair(tokenA, tokenB);

        if (pairAddress !== ethers.ZeroAddress) {
          console.log("🧪 Pool Address:", pairAddress);
        } else {
          console.log("⚠️ Pool not found for path:", tokenA, tokenB);
        }
      }
    } catch (err) {
      console.log("🔍 Failed to fetch pool address", err);
    }
  } catch (err) {
    // Ignore harmless errors
  }
});

// provider.on("block", async (blockNumber) => {
//   console.log(`========New block: ${blockNumber}=============== ${new Date()}`);

//   const block = await provider.getBlock(blockNumber, false);
//   if (!block) {
//     console.log(`Block ${blockNumber} not found`);
//     return;
//   } else {
//     await new Promise((resolve) => setTimeout(resolve, 11000));
//     interface TokensToBuy {
//       tokenAddress: string;
//       ethAmount: number;
//       tokenAmount: number;
//     }
//     let tokensToBuy: TokensToBuy[] = [];
//     if (parsedData) {
//       for (const { parsed, tx } of parsedData) {
//         if (!parsed.args.path) return;
//         console.log(parsed.args.path,'args path');
//         const tokenAddress = parsed?.args.path[1];
//         const ethAmount = Number(tx.value) / 1e18;
//         const tokenAmount = Number(parsed?.args.amountOutMin) / 1e18;

//         if (parsed.name === "swapExactETHForTokens") {
//           const existingIndex = tokensToBuy.findIndex(
//             (item) => item.tokenAddress === tokenAddress
//           );
//           if (existingIndex !== -1) {
//             tokensToBuy[existingIndex].ethAmount += ethAmount;
//             tokensToBuy[existingIndex].tokenAmount += tokenAmount;
//           } else {
//             tokensToBuy.push({ tokenAddress, ethAmount, tokenAmount });
//           }
//         }

//         if (parsed.name === "swapETHForExactTokens") {
//           const existingIndex = tokensToBuy.findIndex(
//             (item) => item.tokenAddress === tokenAddress
//           );
//           if (existingIndex !== -1) {
//             tokensToBuy[existingIndex].ethAmount -= ethAmount;
//             tokensToBuy[existingIndex].tokenAmount -= tokenAmount;
//           } else {
//             tokensToBuy.push({
//               tokenAddress,
//               ethAmount: -ethAmount,
//               tokenAmount: -tokenAmount,
//             });
//           }
//         }
//         //left buy logic
//         console.log(tokensToBuy);
//         parsedData = [];
//       }
//     }
//   }
// });

type ReservoirSwapStep = {
  id: string;
  items: {
    status: string;
    data: {
      from: string;
      to: string;
      data: string;
      value: string;
      gas?: string;
      gasPrice?: string;
    };
  }[];
};
const privateKey = process.env.PRI_KEY as string;
const wallet = new ethers.Wallet(privateKey, provider);
const executeReservoirSwap = async (
  steps: ReservoirSwapStep[],
  signer: ethers.Signer
) => {
  let tx_hash: string | undefined;
  for (const step of steps) {
    for (const item of step.items) {
      const txData = item.data;
      const tx = {
        to: txData.to,
        data: txData.data,
        value: txData.value ? ethers.toBigInt(txData.value) : 0n,
      };

      try {
        console.log(
          `📤 Sending ${step.id.toUpperCase()} tx to ${txData.to}...`
        );
        const txResponse = await signer.sendTransaction(tx);
        const receipt = await txResponse.wait();
        console.log(`✅ ${step.id} confirmed: ${receipt!.hash}`);
        tx_hash = receipt!.hash;
        // await delay(2000);
      } catch (err) {
        throw err; // You may want to handle or log it better
      }
    }
  }
  return tx_hash;
};
// (async () => {
//   console.log("starting");
//   const options = {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     // body: `{"useReceiver":true,"user":"0x2b79343CAc4CD5a4aF2b359ddb718393d2e02280","originChainId":1,"destinationChainId":1,"amount":"800000000000000","originCurrency":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","destinationCurrency":"0xaddF205A24C13e2dd3685bff238b2124E17F0613","tradeType":"EXACT_INPUT","slippageTolerance":"50","appFees":[]}`,
// body: `{"useReceiver":true,"user":"0x2b79343CAc4CD5a4aF2b359ddb718393d2e02280","originChainId":1,"destinationChainId":1,"amount":"91064698024270","originCurrency":"0xaddF205A24C13e2dd3685bff238b2124E17F0613","destinationCurrency":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","tradeType":"EXACT_INPUT","slippageTolerance":"50","appFees":[]}`,
//     // body: `{"useReceiver":true,"user":"0x2b79343CAc4CD5a4aF2b359ddb718393d2e02280","originChainId":1,"destinationChainId":1,"amount":"50000000000000","originCurrency":50"}],"userOperationGasOverhead":50000,"forceSolverExecution":false}`,
//     // body: `{"useReceiver":true,"user":"0x2b79343CAc4CD5a4aF2b359ddb718393d2e02280","originChainId":1,"destinationChainId":1,"amount":"50000000000000","originCurrency":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","destinationCurrency":"0xaddF205A24C13e2dd3685bff238b2124E17F0613","tradeType":"EXACT_INPUT","recipient":"0x2b79343CAc4CD5a4aF2b359ddb718393d2e02280","slippageTolerance":"50","appFees":[{"recipient":"0x0000000000000000000000000000000000000002","fee":"20"}],"userOperationGasOverhead":50000,"forceSolverExecution":true}`,
//     // body: `{"useReceiver":true,"user":"0x2b79343CAc4CD5a4aF2b359ddb718393d2e02280","originChainId":1,"destinationChainId":1,"amount":"91064698024270","originCurrency":"0xaddF205A24C13e2dd3685bff238b2124E17F0613","destinationCurrency":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","tradeType":"EXACT_INPUT","recipient":"0x2b79343CAc4CD5a4aF2b359ddb718393d2e02280","slippageTolerance":"100","appFees":[],"userOperationGasOverhead":50000,"forceSolverExecution":false}`,
//   };

//   const res = await fetch("https://api.relay.link/quote", options);
//   const json = await res.json();
//   console.log(JSON.stringify(json, null, 2));
//   const swapRes = await executeReservoirSwap(json.steps, wallet);
//   console.log("ended");
// })();
