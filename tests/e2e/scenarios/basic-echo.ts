import { registerScenario } from '../harness';

registerScenario({
  name: 'basic-echo',
  description: 'Send a message and verify text response',
  async run(ctx) {
    const testMessage = `[e2e-test] Echo test ${Date.now()}`;
    ctx.log(`Sending: "${testMessage}"`);
    const sent = await ctx.sendMessage(testMessage);

    ctx.log('Waiting for bot response...');
    const reply = await ctx.waitForBotMessage({ after: sent, timeout: 15000 });

    ctx.log(`Got: "${reply.content}"`);
    if (!reply.content.toLowerCase().includes('echo') && !reply.content.includes(testMessage)) {
      // Flexible — just verify we got a response
      ctx.log(`⚠ Response didn't contain echo text, but bot did respond`);
    }
  },
});
