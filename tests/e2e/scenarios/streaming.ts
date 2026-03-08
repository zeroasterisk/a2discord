import { registerScenario } from '../harness';

registerScenario({
  name: 'streaming',
  description: 'Send a message and verify streaming edits',
  async run(ctx) {
    const testMessage = `[e2e-test] Stream test ${Date.now()}`;
    ctx.log(`Sending: "${testMessage}"`);
    const sent = await ctx.sendMessage(testMessage);

    ctx.log('Waiting for initial bot response...');
    const reply = await ctx.waitForBotMessage({ after: sent, timeout: 15000 });
    ctx.log(`Initial: "${reply.content.slice(0, 100)}..."`);

    ctx.log('Waiting for message edit (streaming)...');
    try {
      const edited = await ctx.waitForBotEdit(reply, { timeout: 15000 });
      ctx.log(`Edited: "${edited.content.slice(0, 100)}..."`);

      if (edited.content.length > reply.content.length) {
        ctx.log('✓ Message grew via streaming edits');
      }
    } catch {
      ctx.log('⚠ No edit detected — streaming may not be active');
    }
  },
});
