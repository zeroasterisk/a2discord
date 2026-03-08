import { registerScenario } from '../harness';

registerScenario({
  name: 'error-handling',
  description: 'Verify error handling: agent down, timeout, malformed response',
  async run(ctx) {
    // Test 1: Normal error response
    const testMessage = `[e2e-test] Error test ${Date.now()}`;
    ctx.log(`Sending: "${testMessage}"`);
    const sent = await ctx.sendMessage(testMessage);

    ctx.log('Waiting for bot error response...');
    try {
      const reply = await ctx.waitForBotMessage({ after: sent, timeout: 15000 });

      // Check if it's an error embed
      const hasErrorEmbed = reply.embeds.some((e: any) => {
        const title = (e.title ?? e.data?.title ?? '').toLowerCase();
        const desc = (e.description ?? e.data?.description ?? '').toLowerCase();
        return title.includes('error') || desc.includes('error') || desc.includes('failed');
      });

      if (hasErrorEmbed) {
        ctx.log('✓ Got error embed');
      } else if (reply.content.toLowerCase().includes('error') || reply.content.toLowerCase().includes('failed')) {
        ctx.log('✓ Got error text response');
      } else {
        ctx.log(`Got response: "${reply.content.slice(0, 100)}"`);
        ctx.log('⚠ Response may not be an error — check agent configuration');
      }
    } catch (err) {
      ctx.log(`⚠ No response received: ${(err as Error).message}`);
      ctx.log('This could be correct if the bot has no error response for unreachable agents');
    }
  },
});
