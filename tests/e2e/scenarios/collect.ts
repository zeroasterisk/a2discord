import { registerScenario } from '../harness';

registerScenario({
  name: 'collect',
  description: 'Trigger COLLECT flow, verify modal prompt appears',
  async run(ctx) {
    const testMessage = `[e2e-test] Collect test ${Date.now()}`;
    ctx.log(`Sending: "${testMessage}"`);
    const sent = await ctx.sendMessage(testMessage);

    ctx.log('Waiting for bot response...');
    const reply = await ctx.waitForBotMessage({ after: sent, timeout: 15000 });

    // COLLECT should render as a message with a "Provide Info" button
    const hasButtons = reply.components.some((row: any) =>
      row.components?.some((c: any) => c.type === 2)
    );

    if (hasButtons) {
      ctx.log('✓ Response has interactive button (likely "Provide Info")');
      if (ctx.interactive) {
        ctx.log('In interactive mode, you can click the button in Discord to open the modal.');
        await ctx.prompt('Press enter after testing the modal...');
      }
    } else if (reply.embeds.length > 0) {
      ctx.log('✓ Got embed response (may contain form fields)');
    } else {
      ctx.log(`Got text response: "${reply.content.slice(0, 100)}"`);
      ctx.log('⚠ COLLECT rendering may not be implemented yet');
    }
  },
});
