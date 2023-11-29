# Structured Content Generation with a Language Model, Image Diffuser, and Real-time Data

## Overview

This project utilizes a language model to generate structured content from a simple prompt, complemented by images created through a diffusion model, and enhanced with real-time data from Google searches. The main entry point for content generation is the `generateBlog.mjs` script located in the `src` directory.

## How to Run

### Installation

Before running the project, install the necessary dependencies:

```
npm install
```

### Starting the Application

To start the content generation process, use the `npm start` command, which is configured to execute the `generateBlog.mjs` script.

```
npm start
```

## Detailed Breakdown

### Local Memory Creation

The `prepareAndGetOrganicData` function within `src/createLocalMemory.mjs` creates a local vector storage instance. It scrapes Google search results based on the user's request, processes the content, and uses OpenAI's embeddings to generate a vector store for efficient searching.

### Creating an Outline

The `getEngagingBlog` function in `src/utilities.mjs` crafts an outline for the blog post. It prompts a GPT model with the user's request to generate a structured outline.

### Generating the Header Image

The `getHeaderImageForBlog` function in `src/utilities.mjs` generates a header image using the Stability API. It formulates a prompt for the GPT model based on the user's request, which is then used to guide the image generation process.

### Content Generation

The `getImprovedSectionUsingLocalMemory` function iterates over each section of the outline, performing research and integrating recent data from Google. This data is stored in a local memory instance and used to enhance the content.

### Finalizing the Content

The `refineFinalBlog` function in `src/utilities.mjs` finalizes the content by combining all sections, refining the narrative, and ensuring a professional touch. The content is saved in both Markdown and PDF formats.

### Output Visualization

The generated content can be visualized by opening `Read-MD.ipynb`, which renders the Markdown content as HTML for easy viewing.

## Project Structure

- `src/`: Contains all the source code for content generation.
  - `generateBlog.mjs`: The main script to run for generating blog posts.
  - `createLocalMemory.mjs`: Functions for creating and managing local memory with scraped data.
  - `utilities.mjs`: Helper functions for content generation and image creation.
  - `logColoredMessages.mjs`: Utility for logging messages with color in the console.
- `package.json`: Project metadata and dependencies.
- `.gitignore`: Specifies files and directories to be ignored by Git.
- `README.md`: Documentation for the project.

Please ensure you have the necessary environment variables set before running the project, as these are required for accessing various APIs and services.

This is how the `.env` should look like:

```
OPENAI_API_KEY = ""
OPENAI_CHAT_MODEL = "gpt-4-1106-preview"
OPENAI_COMPLETION_MODEL = "gpt-3.5-turbo-16k-0613"
TEMPERATURE = 0.3
GPT_4_COMPLETION = false # Put true for GPT4 Turbo completion in stead of 3.5
STABILITY_API_KEY = "" # For image generation
STABILITY_ENGINE_ID = "stable-diffusion-xl-1024-v1-0"
SERPAPI_API_KEY = "" # For Google search
```

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change or add. You can always fork the repo and raise a PR.
