import { PromptTemplate } from "langchain/prompts";
import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage, SystemMessage } from "langchain/schema";
import fetch from "node-fetch";
import dotenv from "dotenv";
import colors, { consoleLogWithColor } from "./logColoredMessages.mjs";

dotenv.config();

export async function gptCompletion(
  template,
  maxTokens = 1350,
  temperature = 0.1
) {
  if (process.env.GPT_4_COMPLETION.toLowerCase() == "true") {
    // consoleLogWithColor("Utilizing GPT-4 for completion.")
    const chat = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: temperature,
      maxTokens: maxTokens,
      modelName: process.env.OPENAI_CHAT_MODEL,
    });
    const response = await chat.call([
      new SystemMessage(
        `You are a helpful assistant who works similarly to the GPT completion model. Just complete the content written by the user and stop. Don't write extra.`
      ),
      new HumanMessage(template),
    ]);

    return response.content.trim();
  } else {
    // consoleLogWithColor("Utilizing GPT-3.5 TURBO for completion.")
    const model = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: temperature,
      maxTokens: maxTokens,
      modelName: process.env.OPENAI_CHAT_MODEL,
    });
    const res = await model.call(template);
    return res.trim();
  }
}

async function getImprovedSectionUsingLocalMemoryTemplate(
  userRequest,
  originalSection,
  relatedChunksFromLocalMemory,
  sectionHeading
) {

  const template = `
I have composed a compelling blog post in the style of Medium for one of the users on my platform. The user requested the following:

REQUEST:
{userRequest}

To ensure a well-structured blog post, I have included the following sections:

INTRODUCTION (The introduction effectively engages the reader by introducing the central theme and highlighting the unique value proposition, supported by relevant and up-to-date facts and figures.)
SECTION 1 (This section offers a comprehensive analysis of the first major point, supported by a captivating story or example, pertinent facts, quotes, or statistics, and thought-provoking, open-ended questions.)
SECTION 2 (In this section, I delve into the second major point, providing two compelling stories or examples to support the argument, while also establishing a connection to the first section and presenting additional factual information.)
SECTION 3 (This section provides a concise overview of the key points discussed, supported by thorough research, expert quotes, and data. It also outlines potential implications and concludes with a compelling call to action.)
CONCLUSION (The conclusion of the blog post leaves a lasting impression by summarizing the main takeaway, incorporating a powerful statement or quote, and reinforcing the point with verified and impactful facts or figures.)

Upon reflection, I have identified a need for more real-time facts in certain sections. To address this, I will focus on each section individually, conducting thorough research through Google searches and extracting relevant information from top search results. I will then incorporate these authentic facts and figures into the respective sections, ensuring the original essence remains intact and the length of enhanced section also remains close to the original section. Currently, I am working on the following section:

CURRENT SECTION:
{sectionHeading}: {originalSection}

To enhance the section, I have gathered the latest facts and information from Google search results related to this section. These findings are as follows:

LATEST FACTS AND INFORMATION GATHERED FROM GOOGLE SEARCH RESULTS (Source URLs and Link titles included):
{relatedChunksFromLocalMemory}

Please assist me in rewriting the current section, ensuring the exact similar structure, and incorporating the verified facts and figures obtained from the Google search. Don't forget to CITE THE SOURCES from where you pick up the information from. Try to amalgamate the facts and key findings in the section content, so the information doesn't look out of the order. It is crucial to maintain the original essence of the section while enhancing it with accurate and up-to-date information. If any facts are already present in the original section, please improve them by including the verified information. Retain the exact essence of a Medium's article section. Keep the exact similar tone and essence as was in the original section. Feel free to apply markdown formatting wherever necessary. Feel free to add bullet points wherever needed. Don't include the facts if they aren't needed. In that case, return the original article back. Please STRICTLY restrict the length of the enhanced section to that of the original one, and don't add any extra text before or after it. 

ENHANCED SECTION (WITHOUT HEADING - EXACTLY THE SAME LENGTH AS THE ORIGINAL SECTION):
`;

  const prompt = new PromptTemplate({
    template: template,
    inputVariables: [
      "userRequest",
      "originalSection",
      "relatedChunksFromLocalMemory",
      "sectionHeading"
    ],
  });

  const pr = await prompt.formatPromptValue({
    userRequest: userRequest,
    originalSection: originalSection,
    relatedChunksFromLocalMemory: relatedChunksFromLocalMemory,
    sectionHeading: sectionHeading.toUpperCase()
  });

  return pr.value;
}

async function getHeaderImagePromptForArticleTemplate(userRequest) {
  const template = `
This is the title of the blog title I recently composed for one of my users:

BLOG TITLE:
{userRequest}

In order to truly elevate the visual allure of my blog, I am eager to harness the extraordinary power of AI image diffuser models. With its boundless potential, I envision a mesmerizing feature/header image that flawlessly captures the essence of the entire blog, leaving readers utterly enthralled and unable to resist its irresistible charm at first glance. It is imperative that you provide me with an awe-inspiring and irresistible prompt, meticulously crafted based on the intricate details of my blog, which I can utilize to generate the image using the unparalleled capabilities of a diffuser model such as DALL-E. Leave no stone unturned in your prompt, meticulously incorporating an abundance of intricate details to ensure an image that truly captivates and commands attention. Try to include parameters such as realistic photography, vintage style photography, documentary style photography etc wherever they fit best, as they significantly improve the quality of image generated.

DIFFUSER PROMPT:`;
  
    const prompt = new PromptTemplate({
      template: template,
      inputVariables: ["userRequest"]
    });
  
    const pr = await prompt.formatPromptValue({
      userRequest: userRequest
    });
  
    return pr.value;
}

export async function getHeaderImageForBlog(userRequest, imageType) {
  const template = await getHeaderImagePromptForArticleTemplate(
    userRequest
  );
  
  var res = await gptCompletion(template);

  consoleLogWithColor(`\nThe prompt for generating the header image: ${res.trim()}`)

  const engineId = process.env.STABILITY_ENGINE_ID;

  const apiHost = process.env.API_HOST ?? "https://api.stability.ai";
  const apiKey = process.env.STABILITY_API_KEY;

  if (!apiKey) throw new Error("Missing Stability API key.");

  const response = await fetch(
    `${apiHost}/v1/generation/${engineId}/text-to-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: res,
          },
        ],
        cfg_scale: 7,
        clip_guidance_preset: "FAST_BLUE",
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Non-200 response: ${await response.text()}`);
  }

  const responseJSON = await response.json();

  const markdownImageContent = responseJSON.artifacts
    .map((image, index) => {
      const base64Data = image.base64.split(";base64,").pop();
      return `<div style="text-align: center;"><img src="data:image/png;base64,${base64Data}" alt="${imageType}" /></div>\n\n`;
    })
    .join("");

  return markdownImageContent;

  // fs.writeFileSync('output.md', markdownContent);
}

async function getEngagingBlogTemplate(userRequest) {
  const template = `
I have to compose an exceptional 1500-2000 word article for a well known news agency, employing a conversational, casual and captivating tone. Here's the user's request I have received:

USER'S REQUEST: {userRequest}

This is the outline I have to follow:

INTRODUCTION (300-400 words): Begin with a riveting anecdote or a profound question that instantly hooks the reader. Introduce the central theme or insight that will be explored in the article. Emphasize the unique value proposition for the reader, articulating why they should invest their time in reading further. Incorporate relevant facts or figures to set the stage for the discussion.

SECTION 1 (250-400 words): Delve into the first major point or insight related to the topic, providing an in-depth analysis. Incorporate a compelling story or example to illuminate your central argument. Bolster your point with pertinent facts, quotes, or statistics. Engage the reader by posing thought-provoking, open-ended questions. Seamlessly transition to the subsequent section.

SECTION 2 (250-400 words): Analyze the second major point or insight related to the topic, providing a thorough exploration. Include two compelling stories or examples to fortify your argument. Draw connections to the points discussed in the first section, emphasizing the interrelation of these concepts. Supplement your argument with additional facts, figures or statistics and pose another intriguing, open-ended question.

SECTION 3 (350-450 words): Summarize the key points or insights discussed thus far. Elucidate why these concepts are of significance to the reader, supported by credible research, expert quotes, and relevant data. Discuss the potential implications or outcomes if the reader decides to act on the information. Conclude by issuing a compelling call-to-action or a thought-provoking question, leaving the reader with food for thought.

CONCLUSION (100-200 words): Conclude the article with a succinct paragraph that reinforces the main takeaway or encourages the reader to act. End with a powerful statement or quote that leaves a lasting impact. Don't forget to include a final compelling fact or figure that underscores your main point.

Please include all the section headings like specified i.e SECTION 1, SECTION 2, SECTION 3, CONCLUSION. I need the final section with the heading 'CONCLUSION'. Here's the article:

INTRODUCTION:
`;

  const prompt = new PromptTemplate({
    template: template,
    inputVariables: ["userRequest"],
  });

  const pr = await prompt.formatPromptValue({ userRequest: userRequest });

  return pr.value;
}

async function refineFinalBlogTemplate(finalBlog) {
  const template = `
I have written a blog for my one my users. However, I wrote it in sections, and then joined them up later on. Due to this, some information may be reduntant in the article. Please help me refine, shorten and re-write it, such that there is a seamless transition between all the sections. Moreover, remove the extra conclusion sections except the last one and seamlessly change the topic to what is talked about next. Make it structured overall, retain the essence and charm it currently has, and add a human touch to it. Should be an engaging read. I just need it crafted more professionally, with a nice ending. Apply markdown formatting wherever needed. Just keep the citings which are really needed, and DON'T FORGET to cite the sources at the end (very necessary). Cite the sources in a clean and structured way with a proper markdown formatting applied to it, and NECESSARILY include the URLs too with those citings. 

MY DRAFT:
{finalBlog}

REFINED BLOG:
`;

  const prompt = new PromptTemplate({
    template: template,
    inputVariables: ["finalBlog"],
  });

  const pr = await prompt.formatPromptValue({ finalBlog: finalBlog });

  return pr.value;  
}

async function getGoogleQueryFromUserRequestTemplate(userRequest) {
  const template = 
  `
Please extract the main concept from this text. I just need the topic out of this. No supporting sentences. For example, from the sentence "I want to write an interesting blog post about staying in the limelight", the main topic/idea can be "staying in the limelight" or "limelight".

SENTENCE:
"{userRequest}"

MAIN CONCEPT:
`;

  const prompt = new PromptTemplate({
    template: template,
    inputVariables: ["userRequest"],
  });

  const pr = await prompt.formatPromptValue({ userRequest: userRequest });

  return pr.value;
}

export async function getGoogleQueryFromUserRequest(userRequest) {
  const template = await getGoogleQueryFromUserRequestTemplate(userRequest);
  var res = await gptCompletion(template, 50, 0.2);
  return Promise.resolve(res.trim());
}

export async function getImprovedSectionUsingLocalMemory(
  userRequest,
  originalSection,
  sectionHeading,
  vectorStore
) {

  const result = await vectorStore.similaritySearch(originalSection, 6);

  const relevantContentFromLocalMemory = result.reduce(
    (accumulator, currentValue) => {
      if (currentValue) {
        accumulator +=
          "\n-----------------------------\n" + currentValue.pageContent + `\nSource: ${currentValue.metadata.source}` + `\nTitle: ${currentValue.metadata.title}`;
        return accumulator;
      } else {
        return accumulator;
      }
    },
    ""
  );

  consoleLogWithColor(`\nWorking on section:\n${originalSection}`, colors.Green);

  consoleLogWithColor(
    `\nFound relevant content:\n${relevantContentFromLocalMemory}`,
    colors.Blue
  );

  const template = await getImprovedSectionUsingLocalMemoryTemplate(
    userRequest,
    originalSection,
    relevantContentFromLocalMemory,
    sectionHeading
  );

  var res = await gptCompletion(template, 800);

  consoleLogWithColor(`\nImproved section:\n${res}`, colors.Blue);

  return Promise.resolve(res);
}

export async function refineFinalBlog(finalBlog){
  const template = await refineFinalBlogTemplate(finalBlog);
  var res = await gptCompletion(template, 1800, 0.3);
  return res.trim()
}

export async function getEngagingBlog(userRequest) {
  const template = await getEngagingBlogTemplate(userRequest);
  var res = await gptCompletion(template, 2500, 0.3);
  res = "INTRODUCTION:\n" + res;
  return res.trim();
}

export async function splitBlogIntoSections(blogContent) {
  const sections = {
    introSection: blogContent
      .match(/INTRODUCTION:(.|\n)*?(?=SECTION 1:)/)[0]
      .replace("INTRODUCTION:", "")
      .trim(),
    section1: blogContent
      .match(/SECTION 1:(.|\n)*?(?=SECTION 2:)/)[0]
      .replace("SECTION 1:", "")
      .trim(),
    section2: blogContent
      .match(/SECTION 2:(.|\n)*?(?=SECTION 3:)/)[0]
      .replace("SECTION 2:", "")
      .trim(),
    section3: blogContent
      .match(/SECTION 3:(.|\n)*?(?=CONCLUSION:)/)[0]
      .replace("SECTION 3:", "")
      .trim(),
    conclusion: blogContent
      .match(/CONCLUSION:(.|\n)*$/)[0]
      .replace("CONCLUSION:", "")
      .trim(),
  };
  return sections;
}
