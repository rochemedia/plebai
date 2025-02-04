# `PlebAI` 💬

Silicon valley elites are pouring billions of dollars in building closed AI systems that can ingest all of our data. Then scare politicians into creating regulations that install them as overlords. They will not win in that game because of millions of Plebs like us band together, build in public (#buildinpublic), democratize AI access for all and beat them in their own game.

We call this movement PlebAI.

Website: https://plebai.com

AI Chat: https://chat.plebai.com

Here's the backend project to find L402 services: https://github.com/lightning-digital-entertainment/plebai-l402

## Features


- No email or signups required
- No credit card or up front payment required
- No Ads or trackers
- Chat history only stored on the browser
- Using only open source LLMs
- Pay with SATS for premium data and faster response (Coming soon)

## Chat interface

![chat interface](https://i.current.fyi/current/app/plebai_cover.png)

## Solution Architecture

We carefully select and utilize the appropriate open-source tools to ensure a seamless integration. Fortunately, there is a wide array of tools available that allow us to piece everything together.

#### Prem AI for hosting Language models

By leveraging state-of-the-art Open-Source Large Language Models (LLMs), Prem offers a unified environment for deploying AI models on your infrastructure. Even with small-scale CPU machines, LLMs can be executed, and models can be accessed through APIs.

#### GPT4ALL Lora Q4 as LLM

GPT4All, developed by Nomic AI, is a chatbot trained on an extensive corpus of assistant interactions. By fine-tuning LLaMA 7B, GPT4All provides an open-source ecosystem for training and deploying efficient, assistant-style large language models locally on consumer-grade CPUs.

#### LLAMA2-7B-HF as LLM

Llama2, developed by Meta, Meta developed and publicly released the Llama 2 family of large language models (LLMs), a collection of pretrained and fine-tuned generative text models ranging in scale from 7 billion to 70 billion parameters. Our fine-tuned LLMs, called Llama-2-Chat, are optimized for dialogue use cases.

#### BIG-AGI Chat user interface

Big-AGI has developed an easy-to-use chat interface that can be quickly customized and deployed. Although it is primarily designed for use with OpenAI ChatGPT, we have modified it to work with our open-source model.

#### Langchain

Langchain enables the integration of external data sources, integration with 3rd party APIs, and the ability to utilize long-term memory and call multiple LLMs. We are currently experimenting with new APIs and data sources.

#### Redis Vector Store

LLMs are stateless and require data to be sent at every invocation. Using redis store to store data as embeddings. Redis can be created inside prem.ai dashboard and monitor the running state. 

#### Zep long term memory

Open source project focused on providing tools to work with langchain to store conversational data for future retrieval. (https://getzep.com)

#### L402 (Lightning Labs)

L402, previously known as LSAT, is a standard that supports the use case of charging for services and authenticating users in distributed networks. It combines the strengths of Macaroons for improved authentication with the capabilities of the Lightning Network for enhanced payments. We plan to utilize this standard to access 3rd party data and APIs.

#### getAlby (Chrome extension)

In the near future, we will enable payment with sats (satoshis) to access premium features and 3rd party data. This approach ensures user anonymity while facilitating seamless payment processing. The Alby wallet, available as a Chrome extension, simplifies the payment process for these services.


## Develop 🧩

PlebAI is a forked version of [BIG-AGI](https://github.com/enricoros/big-agi) 

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=&logo=vercel&logoColor=white)

Clone this repo, install the dependencies, and run the development server:


```bash
git clone https://github.com/lightning-digital-entertainment/plebai
cd plebai
npm install
npm run dev
```

NOTE: Create env file

- Copy .env.example to .env

- Change the GPT4ALL_API_HOST to the backend server running opensource LLMs

- OPEN_API_KEY can be anything. It is just a placeholder


Now the app should be running on `http://localhost:3000`


# About Us

We build open source Apps to solve real world problems using Bitcoin, Lightning, Nostr and AI

For questions, Please reach out to plebai@getcurrent.io

# License

[MIT](https://choosealicense.com/licenses/mit/)