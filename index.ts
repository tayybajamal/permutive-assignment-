import express from "express";
import fs from "fs";
import os from "os";
import { getTaxonomies } from "./taxonomy";
import { Firestore } from "@google-cloud/firestore";
import * as path from "path";

type WebhookRequest =
  | { type: "taxonomies" }
  | { type: "classify"; url: string };

const PROJECT_ID = "permutive-tech-challenges";
const KEY_FILE = "permutive-tech-challenges-tayybajamal.json";
const TAXONOMY_ID = "iab_3_1";

function resolveKeyFilename(): string {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON?.trim();
  if (credentialsJson) {
    const parsed = JSON.parse(credentialsJson) as { private_key?: string };
    if (parsed.private_key?.includes("\\n")) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    const credPath = path.join(os.tmpdir(), "gcp-credentials.json");
    fs.writeFileSync(credPath, JSON.stringify(parsed));
    console.log("Firestore: using GOOGLE_CREDENTIALS_JSON");
    return credPath;
  }

  const localPath = path.join(process.cwd(), KEY_FILE);
  if (fs.existsSync(localPath)) {
    console.log("Firestore: using local credentials file");
    return localPath;
  }

  throw new Error(
    "GCP credentials not found. Set GOOGLE_CREDENTIALS_JSON on Render or add the key file locally."
  );
}

function createFirestore(): Firestore {
  return new Firestore({
    projectId: PROJECT_ID,
    keyFilename: resolveKeyFilename(),
    databaseId: "(default)",
  });
}

const app = express();
app.use(express.json());

const db = createFirestore();

function extractArticleId(url: string): string | null {
  const match = url.match(/\/article\/.*?-(\d+)\/?$/);
  return match?.[1] ?? null;
}

app.post("/webhook", async (request, response) => {
  const body = request.body as WebhookRequest;

  if (body.type === "taxonomies") {
    const taxonomies = getTaxonomies();
    return response.json(taxonomies);
  }

  if (body.type === "classify") {
    try {
      const { url } = body;
      const articleId = extractArticleId(url);

      if (!articleId) {
        return response.json({ classifications: [] });
      }

      const docRef = db.collection("tdc_article_categories").doc(articleId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return response.json({ classifications: [] });
      }

      const rawCategories: string[] = docSnap.data()?.categories ?? [];

      const classifications = rawCategories.map((categoryId) => ({
        type: "categories" as const,
        value: String(categoryId),
        taxonomy: TAXONOMY_ID,
      }));

      return response.json({ classifications });
    } catch (error) {
      console.error("Error processing classify request:", error);
      return response.status(500).json({ error: "Internal Server Error" });
    }
  }

  return response.status(400).json({
    error: `Unknown request type: ${(request.body as { type?: string }).type ?? "unknown"}`,
  });
});

export default app;
