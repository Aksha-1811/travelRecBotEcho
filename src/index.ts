// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import * as restify from 'restify';
import { INodeSocket } from 'botframework-streaming';
import {
    CloudAdapter,
    ConfigurationBotFrameworkAuthentication,
    ConfigurationBotFrameworkAuthenticationOptions
} from 'botbuilder';
import { EchoBot } from './bot';
import { config } from 'dotenv';

const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

const port = process.env.PORT || process.env.port || 3978;

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env as ConfigurationBotFrameworkAuthenticationOptions);
const adapter = new CloudAdapter(botFrameworkAuthentication);

adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError] unhandled error: ${ error }`);
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

const myBot = new EchoBot();

// Create HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

// ✅ Only one listen call
server.listen(port, () => {
    console.log(`\nBot is listening on port ${port}`);
    console.log('\nTest in Web Chat or Emulator: http://localhost:' + port + '/api/messages');
});

// Handle messages
server.post('/api/messages', async (req, res) => {
    await adapter.process(req, res, async (context) => {
        await myBot.run(context);
    });
});

// Handle WebSocket upgrade
server.on('upgrade', async (req, socket, head) => {
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    streamingAdapter.onTurnError = adapter.onTurnError;
    await streamingAdapter.process(req, socket as unknown as INodeSocket, head, (context) => myBot.run(context));
});
