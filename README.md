# Structured Content Generation with a Language Model, Image diffuser, and Real-time data.

## Overview
The primary script to execute is `generateBlog.mjs`. This script imports a set of functions from `utilities.mjs` and `createLocalMemory.mjs` to generate content in a structured manner with an image, incorporating local memory to enhance the generated content.

## Detailed Breakdown:

### Local Memory Creation:
The `prepareAndGetOrganicData` function in the `createLocalMemory.mjs` file is used to create local memory. It fetches Google search results related to the user's request, scrapes the content, splits the content into documents, and generates embeddings for these documents using OpenAI's embeddings. It returns a `FaissStore`, which stores these documents and their corresponding embeddings in a FAISS index, enabling efficient nearest neighbor search.

### Creating an Outline:
The `getEngagingBlog` function in `utilities.mjs` is used to create an outline for the blog post. It uses a template to generate a prompt for the GPT model, which includes the user's request. The GPT model then generates an outline for the content based on this prompt.

###   Generating Image and Determining Image Placement:
The `getHeaderImageForBlog` function is used to generate an Image through the Stability API as the header image. It uses a template to generate a prompt for the GPT model, which includes the user's request. The GPT model then generates a prompt for the stable diffusion model, which is used to generate the image.

### Generating the content:
The `getImprovedSectionUsingLocalMemory` function is used to write the actual content. It iterates over each section in the outline. For each section, it does the following:

- Research: It uses the model and retrieved google data to do some research on the section.
- Writing the Section: It uses the model and local memory to write the section based on the research notes.
- Improving the Section: It uses the model to improve the initial draft of the section.

### Finalizing the content:
The `refineFinalBlog` function is used to finalize the content. It combines all the sections, refines the content to remove redundancies, and adds a professional touch. The finalized content is then saved as a Markdown, and PDF file. 

The output for the query can be visualized in Read-MD.ipynb

