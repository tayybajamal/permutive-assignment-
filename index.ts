import express from "express";
import { getTaxonomies } from "./taxonomy";
import { Firestore } from "@google-cloud/firestore";
import * as path from "path";

type WebhookRequest =
  | { type: "taxonomies" }
  | { type: "classify"; url: string };

const app = express();
app.use(express.json());

const file = 'permutive-tech-challenges-tayybajamal.json';
const path1 = path.join(process.cwd(), file);

const db = new Firestore({
  projectId: 'permutive-tech-challenges',
  keyFilename: path1,
  databaseId: '(default)'
});

app.post("/webhook", async (request, response) => {
  const body = request.body as WebhookRequest;

  if (body.type === "taxonomies") {
    const taxonomies = getTaxonomies();
    return response.json(taxonomies);
  }

  if (body.type === "classify") {
    const { url } = body;
    console.log(" incoming URL:", url);

    let url1 = url;
    if (url1.endsWith('/')) {
      url1 = url1.slice(0, -1);
    }

    const urlParts = url1.split('-');
    const articleId = urlParts[urlParts.length - 1];
    console.log(" Extracted Article ID String:", articleId);

    if (!articleId || isNaN(Number(articleId))) {
      return response.json({ classifications: [] });
    }

    let docRef = db.collection('tdc_article_categories').doc(articleId);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log(` String key "${articleId}" not found. Trying integer key...`);
      docRef = db.collection('tdc_article_categories').doc(String(Number(articleId)));
      docSnap = await docRef.get();
    }

    console.log(" Database document exists?:", docSnap.exists);

    if (!docSnap.exists) {
      console.log("Document does not exist in Firestore collection under this ID.");
      return response.json({ classifications: [] });
    }

    const articleData = docSnap.data();
    console.log(" Data object retrieved:", JSON.stringify(articleData));
    
    const rawCategories = articleData?.categories;
    console.log(" Target categories array:", rawCategories);

    const taxonomiesList = getTaxonomies();
    const dynamicTaxonomyId = taxonomiesList[0]?.id;

    const structuredOutput = [];

    if (rawCategories && Array.isArray(rawCategories)) {
      for (let i = 0; i < rawCategories.length; i++) {
        const currentCategoryNumber = rawCategories[i];
        
        const tagObject = {
          type: "categories",
          value: String(currentCategoryNumber),
          taxonomy: dynamicTaxonomyId 
        };
        
        structuredOutput.push(tagObject);
      }
    }

    console.log(" Sending Output to Permutive:", JSON.stringify({ classifications: structuredOutput }));
    return response.json({ classifications: structuredOutput });
  }

  return response.status(400).json({
    error: `Unknown request type: ${(request.body as { type?: string }).type ?? "unknown"}`,
  });
});

export default app;
