import dotenv from "dotenv";
import { getGroqApiKey } from "../groq-env.js";

dotenv.config();

const key = getGroqApiKey();

console.log("GROQ_API_KEY present:", Boolean(key));
console.log("length:", key.length);
console.log("starts with gsk_:", key.startsWith("gsk_"));
console.log("ends with comma:", key.endsWith(","));
