/**
 * Unit tests for A2DiscordAdapter — the core adapter class.
 * Tests initialization, event handling, and lifecycle.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { A2DiscordAdapter } from '../../src/adapter/index';
import { createMockClient, createMockTextChannel, createMockMessage, createMockUser } from '../helpers/discord-mocks';

describe('A2DiscordAdapter', () => {
  describe('construction', () => {
    it('should be instantiable', () => {
      const adapter = new A2DiscordAdapter();
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(A2DiscordAdapter);
    });

    it.todo('should accept configuration options');
    it.todo('should accept a discord.js Client');
    it.todo('should accept an agent URL');
  });

  describe('lifecycle', () => {
    it.todo('should start and connect to Discord gateway');
    it.todo('should stop and disconnect cleanly');
    it.todo('should emit ready event when connected');
    it.todo('should reconnect on disconnect');
  });

  describe('message handling', () => {
    it.todo('should ignore messages from bots');
    it.todo('should ignore messages outside configured channels');
    it.todo('should forward user messages to A2A agent');
    it.todo('should create a thread for new tasks');
    it.todo('should reuse existing thread for ongoing tasks');
  });

  describe('agent card', () => {
    it.todo('should fetch agent card on startup');
    it.todo('should set bot profile from agent card');
    it.todo('should register slash commands from agent skills');
  });

  describe('error handling', () => {
    it.todo('should send ephemeral error when agent is unreachable');
    it.todo('should handle malformed agent responses');
    it.todo('should handle rate limiting gracefully');
  });
});
