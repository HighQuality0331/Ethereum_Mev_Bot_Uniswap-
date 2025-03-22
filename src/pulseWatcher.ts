import axios from "axios";
import fs from "fs";
import path from "path";
import tokens from "../tokens.json";

const PULSECHAIN_API = "https://api.scan.pulsechain.com/api";

type TokenType = {
  balance: string;
  contractAddress: string;
  decimals: string;
  name: string;
  symbol: string;
  type: string;
};

type TokensFile = {
  address: string;
  tokens: TokenType[];
}[];

const TOKENS_FILE_PATH = path.join(__dirname, "../tokens.json");

export const checkForNewTokens = async (
  address: string
): Promise<TokenType[]> => {
  try {
    const res = await axios.get(PULSECHAIN_API, {
      params: {
        module: "stats",
        action: "tokensupply",
        contractaddress: address,
      },
    });
    console.log(res.data)

    const results: TokenType[] = res.data?.result;

    if (!results || results.length === 0) {
      console.log(`No tokens found for ${address}.`);
      return [];
    }

    // Find existing entry for the address in tokens.json
    const tokenEntry = (tokens as TokensFile).find((item) => item.address === address);

    const alreadyTokens = tokenEntry?.tokens || [];

    // Filter new tokens
    const newTokens = results.filter(
      (token) => !alreadyTokens.some((t) => t.contractAddress === token.contractAddress)
    );

    if (newTokens.length > 0) {
      console.log(`✅ Found ${newTokens.length} new tokens for ${address}`);

      // Update the existing address or add a new one if not present
      if (tokenEntry) {
        tokenEntry.tokens = [...alreadyTokens, ...newTokens];
      } else {
        (tokens as TokensFile).push({
          address,
          tokens: newTokens,
        });
      }

      // Save updated tokens to tokens.json
      fs.writeFileSync(TOKENS_FILE_PATH, JSON.stringify(tokens, null, 2), "utf-8");
      console.log(`💾 tokens.json updated for ${address}`);
    } else {
      console.log(`❌ No new tokens for ${address}`);
    }

    return newTokens;
  } catch (error) {
    console.error(`❌ Error fetching tokens for ${address}:`, error);
    return [];
  }
};
