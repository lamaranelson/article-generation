import {
  getEngagingBlog,
  getImprovedSectionUsingLocalMemory,
  splitBlogIntoSections,
  getGoogleQueryFromUserRequest,
  getHeaderImageForBlog,
  refineFinalBlog,
  gptCompletion,
} from "./utilities.mjs";

import colors, { consoleLogWithColor } from "./logColoredMessages.mjs";

import { prepareAndGetOrganicData } from "./createLocalMemory.mjs";

import fs from "fs";
import markdownpdf from "markdown-pdf";

async function generateBlog(userRequest) {
  //   consoleLogWithColor(JSON.stringify(userRequest));

  const googleQueryPromise = getGoogleQueryFromUserRequest(userRequest);

  const googleQuery = await Promise.all([googleQueryPromise]);

  const rootFolder = String(googleQuery).replace(/["\s,./]/g, "_");

  if (!fs.existsSync(rootFolder)) {
    // Create directoryToStoreScrapedData if it doesn't exist already
    fs.mkdirSync(rootFolder, { recursive: true });
  }

  consoleLogWithColor(`\nQuerying google with this query: ${googleQuery}`);

  const vectorStorePromise = prepareAndGetOrganicData(
    String(googleQuery),
    true,
    rootFolder
  );

  const vectorStorePromiseList = await Promise.all([vectorStorePromise]);
  const vectorStore = vectorStorePromiseList[0];

  const blogTitle = await gptCompletion(
    `Please write me a capitivating title for the blog I have written for the user whose initial request was this:\nREQUEST:\n${userRequest}\n\nTITLE:\n`
  );

  consoleLogWithColor(
    `\nWriting short article for user request: "${userRequest}"`
  );

  const generatedBlog = await getEngagingBlog(userRequest);

  consoleLogWithColor(`\nDone!`);

  var filename = blogTitle.replace(/^"(.*)"$/, "$1").replace(/[^\w]/g, "_");

  fs.writeFileSync(
    `${rootFolder}/firstLookBlog_${filename}.txt`,
    String(blogTitle + "\n\n" + generatedBlog)
  );

  consoleLogWithColor(
    `\n-> FIRST-LOOK BLOG WRITTEN AND SAVED LOCALLY TO FILE: firstLookBlog_${filename}.txt!\n`,
    colors.Yellow
  );

  consoleLogWithColor(`\nBlog Title: ${blogTitle}`, colors.Yellow);

  consoleLogWithColor(generatedBlog, colors.Yellow);

  consoleLogWithColor(`\nSplitting blog into sections...`, colors.Green);

  const sections = await splitBlogIntoSections(generatedBlog);

  consoleLogWithColor(`\nSections:\n`, colors.Green);

  consoleLogWithColor(JSON.stringify(sections, null, 2), colors.Green);

  consoleLogWithColor(`\nDoing further operations...`, colors.Blue);

  consoleLogWithColor(
    `\nScraping google and creating local memory for request: ${userRequest}`,
    colors.Blue
  );

  const improvedSectionsPromises = Object.keys(sections).map(
    (sectionHeading, index) => {
      return getImprovedSectionUsingLocalMemory(
        userRequest,
        sections[sectionHeading],
        sectionHeading,
        vectorStore
      );
    }
  );

  const improvedSections = await Promise.all(improvedSectionsPromises);

  const finalBlog = String(blogTitle + "\n\n" + improvedSections.join("\n\n"));

  fs.writeFileSync(`${rootFolder}/rawFinalBlog_${filename}.txt`, finalBlog);
  consoleLogWithColor("\nRefining the blog...\n", colors.cyan);

  var finalBlogImproved = await refineFinalBlog(finalBlog);

  finalBlogImproved = finalBlogImproved.replace(/\^/g, "");

  fs.writeFileSync(
    `${rootFolder}/finalBlog_${filename}.txt`,
    finalBlogImproved
  );

  consoleLogWithColor(
    `\n-> FINAL BLOG WRITTEN AND SAVED LOCALLY TO FILE: finalBlog_${filename}.txt!\n`,
    colors.Yellow
  );

  consoleLogWithColor(`\n${finalBlogImproved}`, colors.Yellow);

  const markdownHeaderImageContent = await getHeaderImageForBlog(
    String(blogTitle),
    "Header Image"
  );

  const markdownContent = markdownHeaderImageContent + finalBlogImproved;

  // Save markdown content as .md file (not needed if you want to directly output .pdf)
  fs.writeFile(
    `${rootFolder}/${filename}.md`,
    markdownContent,
    (err) => {
      if (err) {
        consoleLogWithColor(err, colors.Red);
        return;
      }
      consoleLogWithColor("\nMarkdown File written successfully.");
    }
  );

  fs.createReadStream(`${rootFolder}/${filename}.md`)
    .pipe(markdownpdf())
    .pipe(fs.createWriteStream(`${rootFolder}/${filename}.pdf`));

  consoleLogWithColor("\nPdf File written successfully.");
  
  return markdownContent;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const userInput = "I want to write a short blog post about the Amazon Forest";

  generateBlog(userInput);
}
export { generateBlog };
