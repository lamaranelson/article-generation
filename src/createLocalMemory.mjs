import axios from "axios";
import { load } from "cheerio";
import fs from "fs";
import events from "events";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import colors, { consoleLogWithColor } from "./logColoredMessages.mjs";
import { GoogleSearch } from "google-search-results-nodejs";

import { config } from "dotenv";

config();

const search = new GoogleSearch(
  process.env.SERPAPI_API_KEY
);

events.EventEmitter.defaultMaxListeners = 20;

const selectRandom = () => {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36",
  ];
  const randomNumber = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomNumber];
};

async function scrapeContent(
  serp_data,
  index,
  directoryToStoreScrapedData,
  whetherToStoreScrapedResults
) {
  const url = serp_data.link;
  const title = serp_data.title;
  const snippet = serp_data.snippet;

  if (url.includes("twitter.com")) {
    console.log(`Skipping URL ${url} as it belongs to Twitter.`);
    return Promise.resolve(null);
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": selectRandom(),
      },
      timeout: 5000,
    });

    if (typeof response.data !== "string") {
      consoleLogWithColor(
        `Error scraping content from ${url}: Invalid response body`,
        colors.Red
      );
      return Promise.resolve(null);
    }

    const $ = load(response.data);

    // Select 'p', 'li', 'h1', 'h2', and 'h3' tags
    const textExtracts = $("body").find("p"); // .not("header p").not("footer p") , li

    let meaningfulContent = "";
    textExtracts.each((index, element) => {
      meaningfulContent += $(element).text() + "\n";
    });

    if (meaningfulContent && meaningfulContent.length >= 50) {
      const textExtractsArray = meaningfulContent.split("\n");
      const filteredParagraphs = textExtractsArray.filter((paragraph) => {
        const wordsCount = paragraph.split(" ").length;
        return wordsCount >= 15;
      });

      meaningfulContent = filteredParagraphs.join("\n");

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
      });

      const docs = await textSplitter.createDocuments([meaningfulContent]);

      for (var doc in docs) {
        docs[doc].metadata.source = url;
        docs[doc].metadata.title = title;
        docs[doc].metadata.snippet = snippet;
      }

      if (whetherToStoreScrapedResults) {
        if (!fs.existsSync(directoryToStoreScrapedData)) {
          // Create directoryToStoreScrapedData if it doesn't exist already
          fs.mkdirSync(directoryToStoreScrapedData, { recursive: true });
        }

        fs.writeFileSync(
          `${directoryToStoreScrapedData}/${index}_content_${url.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}.txt`,
          meaningfulContent
        );
      }

      return Promise.resolve(docs);
    } else {
      consoleLogWithColor(
        `Content scraped is too short for ${url}. Skipping...`,
        colors.Red
      );
      return Promise.resolve(null);
    }
  } catch (error) {
    consoleLogWithColor(
      `\nError scraping content from ${url}: ${error.message}`,
      colors.Red
    );
    return Promise.resolve(null);
  }
}

export async function prepareAndGetOrganicData(
  query,
  whetherToStoreScrapedResults,
  rootFolder
) {

  const currentYear = new Date().getFullYear();
  const year_count = currentYear - 2021;

  // console.log(year_count);

  const params = {
    // engine: "google",
    q: query,
    // location: "Austin, Texas, United States",
    // google_domain: "google.com",
    // gl: "us",
    // hl: "en",
    as_qdr: `y${year_count}`,
  };

  const data = await new Promise((resolve) => {
    search.json(params, (data) => resolve(data));
  });

  const organicResults = data.organic_results;

  consoleLogWithColor(`Organic results found:\n\n${JSON.stringify(organicResults,null,2)}`,colors.Green)

  const scrapePromises = organicResults.map((result, index) =>
    scrapeContent(
      result,
      index + 1,
      `${rootFolder}/scrapedResults_${query.replace(/[ .]/g, "_")}`,
      whetherToStoreScrapedResults
    )
  );

  const scrapedData = await Promise.all(scrapePromises);

  const docsToIndex = scrapedData.reduce((accumulator, currentValue) => {
    if (currentValue) {
      return accumulator.concat(currentValue);
    } else {
      return accumulator;
    }
  }, []);

  consoleLogWithColor(
    `\nLength of docs created for local memory is: ${docsToIndex.length}`
  );
  consoleLogWithColor(`\nPreparing local memory...`);

  const vectorStore = await HNSWLib.fromDocuments(
    docsToIndex,
    new OpenAIEmbeddings()
  );

  consoleLogWithColor(`\nDone!`);

  return vectorStore;
}
