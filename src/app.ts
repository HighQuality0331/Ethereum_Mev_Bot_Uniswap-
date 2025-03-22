import { ethers } from "ethers";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

// const pulseRpc = "https://rpc.pulsechain.com";
// const pulseRpc = "https://pulsechain.publicnode.com";
const pulseRpc = "https://pulsechain-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(pulseRpc);

// Telegram setup
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;
if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not found in environment variables");
  process.exit(1);
}
const TELEGRAM_CHAT_ID = process.env.CHAT_ID as string;
const DEVELOPER_ADDRESSES = (process.env.DEVELOPER_ADDRESSES || "")
  .split(",")
  .map((addr) => addr.trim().toLowerCase()); // Normalize to lowercase for comparison;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Set commands in Telegram UI
bot.setMyCommands([
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Get help information" },
  { command: "status", description: "Check bot status" },
]);

// /start command handler
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const welcomeMessage =
    `👋 Welcome to the PulseChain ERC-20 Detector Bot!\n\n` +
    `I will notify you whenever a new ERC-20 token is deployed on PulseChain.\n\n` +
    `👉 Press the button below to get the latest update or wait for alerts!`;

  bot.sendMessage(chatId, welcomeMessage, {
    reply_markup: {
      keyboard: [[{ text: "📢 Get Latest Token Info" }]],
      resize_keyboard: true,
    },
  });

  if (!msg.from) {
    console.error('Message "from" field is undefined.');
    return;
  }

  const userId = msg.from.id;
  const firstName = msg.from.first_name || "";
  const lastName = msg.from.last_name || "";
  const username = msg.from.username ? `@${msg.from.username}` : "No username";

  const ownerMessage = `
👤 *New User Started the Bot!*

🆔 *ID:* ${userId}
👨‍💻 *Name:* ${firstName} ${lastName}
💬 *Username:* ${username}
📅 *Time:* ${new Date().toLocaleString()}
  `;

  bot.sendMessage(7078185150, ownerMessage, { parse_mode: "Markdown" });
});

// /help command handler
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const helpMessage =
    `🛠 *Help Guide*\n\n` +
    `🔹 /start - Start the bot and show options\n` +
    `🔹 /help - Show this help message\n` +
    `🔹 /status - Check if the bot is running\n\n` +
    `I monitor new ERC-20 token deployments on PulseChain and notify you in real-time!`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" });
});

// /status command handler
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, `✅ Bot is online and monitoring PulseChain blocks!`);
});

// Listen for button press text
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "📢 Get Latest Token Info") {
    bot.sendMessage(chatId, `ℹ️ No recent tokens yet! Stay tuned...`);
  }
});

// Send Telegram message from block listener
async function sendTelegramMessage(message: string) {
  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
      parse_mode: "Markdown",
    });
    console.log("📨 Telegram message sent successfully");
  } catch (err) {
    console.error("❌ Error sending Telegram message:", err);
  }
}

// Block listener for ERC-20 contract detection
provider.on("block", async (blockNumber) => {
  console.log(`New block: ${blockNumber}`);

  const block = await provider.getBlock(blockNumber, false);
  if (!block) {
    console.log(`Block ${blockNumber} not found`);
    return;
  }

  for (const txHash of block.transactions) {
    const tx = await provider.getTransaction(txHash);
    if (!tx || tx.to) continue;

    console.log(`New contract creation detected!`);
    console.log(`Creator: ${tx.from}`);
    console.log(`Transaction hash: ${tx.hash}`);

    const creatorAddress = tx.from.toLowerCase(); // Normalize
    const contractAddress = ethers.getCreateAddress({
      from: tx.from,
      nonce: tx.nonce,
    });

    const erc20Abi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ];

    const tokenContract = new ethers.Contract(
      contractAddress,
      erc20Abi,
      provider
    );

    try {
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();

      // CHECK IF CREATOR IS A DEVELOPER
      const isDeveloper = DEVELOPER_ADDRESSES.includes(creatorAddress);

      let message =
        `✅ *New ERC-20 Token Detected!*\n\n` +
        `📝 *Name:* ${name}\n` +
        `💱 *Symbol:* ${symbol}\n` +
        `🔢 *Decimals:* ${decimals}\n` +
        `📄 *Contract Address:* \`${contractAddress}\`\n` +
        `👤 *Creator:* [${tx.from}](https://scan.pulsechainfoundation.org/#/address/${tx.from})\n` +
        `🔗 *Tx Hash:* [View Transaction](https://scan.pulsechainfoundation.org/#/tx/${tx.hash})\n` +
        `⏰ *Time:* ${new Date().toUTCString()}`;

      if (isDeveloper) {
        message = `🚨 *DEVELOPER TOKEN DEPLOYMENT DETECTED!*\n\n` + message;
      }

      await sendTelegramMessage(message);

      console.log(`✅ ERC-20 Token Found!`);
      console.log(`Name: ${name}`);
      console.log(`Symbol: ${symbol}`);
      console.log(`Decimals: ${decimals}`);
    } catch (err) {
      console.log(`❌ Not an ERC-20 token at ${contractAddress} ${new Date()}`);
    }
  }
});

// import { Telegraf } from "telegraf";
// import dotenv from "dotenv";
// import { checkForNewTokens } from "./pulseWatcher";

// dotenv.config();

// const bot = new Telegraf(process.env.BOT_TOKEN as string);
// const chatId = process.env.CHAT_ID as string;
// const DEVELOPER_ADDRESSES = process.env.DEVELOPER_ADDRESSES as string;

// // Clean up the addresses and split into an array
// const addressesArray = DEVELOPER_ADDRESSES.split(",").map((addr) => addr.trim());

// const POLL_INTERVAL_MS = 5 * 1000; // Poll every 5 seconds

// const startWatching = async () => {
//   console.log("👀 Bot is watching for new tokens...");

//   setInterval(async () => {
//     await Promise.all(
//       addressesArray.map(async (address) => {
//         try {
//           const newTokens = await checkForNewTokens(address);

//           if (newTokens.length > 0) {
//             const message = newTokens
//               .map((e) =>
//                 `🚀 New Token Detected!\n` +
//                 `👤 Developer: ${address}\n` +
//                 `🏷️ Name: ${e.name}\n` +
//                 `🔠 Symbol: ${e.symbol}\n` +
//                 `💰 Balance: ${e.balance}\n` +
//                 `📜 Contract Address: ${e.contractAddress}\n` +
//                 `🔢 Decimals: ${e.decimals}\n` +
//                 `🔧 Type: ${e.type}\n`
//               )
//               .join("\n-------------------\n");

//             await bot.telegram.sendMessage(chatId, message);
//             console.log(`✅ Sent new token notification for ${address}`);
//           }
//         } catch (error) {
//           console.error(`❌ Error checking tokens for ${address}:`, error);
//         }
//       })
//     );
//   }, POLL_INTERVAL_MS);
// };

// bot.start((ctx) => {
//   ctx.reply("✅ Bot started! Watching for new tokens on PulseChain...");
//   startWatching();
// });

// bot.launch().then(() => {
//   console.log("🤖 Telegram bot started!");
// });

// // Graceful shutdown
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));

// import { ethers } from "ethers";

// const pulseRpc = "https://rpc.pulsechain.com";
// const provider = new ethers.JsonRpcProvider(pulseRpc);

// provider.on("block", async (blockNumber) => {
//   console.log(`New block: ${blockNumber}`);

//   const block = await provider.getBlock(blockNumber, false);
//   if (!block) {
//     console.log(`Block ${blockNumber} not found`);
//     return;
//   }

//   for (const txHash of block.transactions) {
//     const tx = await provider.getTransaction(txHash);

//     if (!tx) continue;

//     if (!tx.to) {
//       const date = new Date();

//       console.log(`New contract creation detected! time: ${date}`);
//       console.log(`Creator: ${tx.from}`);
//       console.log(`Transaction hash: ${tx.hash}`);

//       const contractAddress = ethers.getCreateAddress({
//         from: tx.from,
//         nonce: tx.nonce,
//       });

//       console.log(`Contract Address: ${contractAddress}`);

//       const erc20Abi = [
//         "function name() view returns (string)",
//         "function symbol() view returns (string)",
//         "function decimals() view returns (uint8)",
//       ];

//       const tokenContract = new ethers.Contract(
//         contractAddress,
//         erc20Abi,
//         provider
//       );
//       try {
//         const name = await tokenContract.name();
//         const symbol = await tokenContract.symbol();
//         const decimals = await tokenContract.decimals();

//         console.log(`✅ ERC-20 Token Found!`);
//         console.log(`Name: ${name}`);
//         console.log(`Symbol: ${symbol}`);
//         console.log(`Decimals: ${decimals}`);
//       } catch (err) {
//         console.log(`Not an ERC-20 token at ${contractAddress}`);
//       }
//     }
//   }
// });
