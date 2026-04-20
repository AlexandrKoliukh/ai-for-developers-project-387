FROM node:24-slim

RUN apt-get update && apt-get install -y git curl bash \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code

WORKDIR /workspace

CMD ["claude"]
