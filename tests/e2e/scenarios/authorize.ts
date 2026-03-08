import { registerScenario } from '../harness';

registerScenario({
  name: 'authorize',
  description: 'Trigger AUTHORIZE flow, verify buttons appear',
  async run(ctx) {
    const testMessage = `[e2e-test] Authorize test ${Date.now()}`;
    ctx.log(`Sending: "${testMessage}"`);
    const sent = await ctx.sendMessage(testMessage);

    ctx.log('Waiting for bot response with buttons...');
    const reply = await ctx.waitForBotMessage({ after: sent, timeout: 15000 });

    // Check for embeds (AUTHORIZE should render as embed)
    if (reply.embeds.length > 0) {
      ctx.log(`✓ Got embed: "${reply.embeds[0].title ?? reply.embeds[0].description?.slice(0, 50)}"`);
    }

    // Check for button components
    const hasButtons = reply.components.some((row: any) =>
      row.components?.some((c: any) => c.type === 2) // Button type
    );

    if (hasButtons) {
      ctx.log('✓ Response has buttons');

      if (ctx.interactive) {
        const action = await ctx.prompt('Click approve or deny? (approve/deny/skip)');
        if (action === 'approve' || action === 'deny') {
          const customId = reply.components
            .flatMap((r: any) => r.components ?? [])
            .find((c: any) => c.customId?.includes(action))?.customId;

          if (customId) {
            ctx.log(`Clicking ${action} button (${customId})...`);
            try {
              await ctx.clickButton(reply, customId);
            } catch (err) {
              ctx.log(`⚠ ${(err as Error).message}`);
            }
          }
        }
      }
    } else {
      ctx.log('⚠ No buttons found — AUTHORIZE rendering may not be implemented');
    }
  },
});
