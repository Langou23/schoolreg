import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le .env à la racine du projet
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Créer un JWT spécial pour le service payments-fastapi
const serviceToken = jwt.sign(
  { 
    service: "payments-fastapi", 
    role: "system",
    userId: "service-payments",
    email: "service@payments.internal"
  },
  JWT_SECRET,
  { expiresIn: "365d" }
);

console.log("\n🔐 SERVICE TOKEN GENERATED FOR payments-fastapi");
console.log("=" .repeat(80));
console.log("\nAdd this to your .env file:");
console.log("\nSERVICE_JWT=" + serviceToken);
console.log("\n" + "=".repeat(80));
console.log("\n✅ Token valid for 365 days");
console.log("📋 Token payload:", jwt.decode(serviceToken));
console.log("\n");
