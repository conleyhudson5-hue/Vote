import { Response } from 'express';

interface SseClient {
  id: string;
  res: Response;
}

class SseBroker {
  private clients: Map<string, SseClient> = new Map();

  addClient(id: string, res: Response) {
    this.clients.set(id, { id, res });
    
    // Initial ping
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to live voting feed', clientId: id, timestamp: Date.now() })}\n\n`);

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  broadcast(eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(payload);
      } catch (err) {
        console.error(`Error sending SSE to ${id}:`, err);
        this.clients.delete(id);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseBroker = new SseBroker();
