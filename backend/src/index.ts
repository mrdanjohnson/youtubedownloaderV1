// Application entry point
import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

// Get port from environment or use default
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Start server
const server = app.listen(Number(PORT), HOST, () => {
  console.log('========================================');
  console.log('  YT Insight Backend Server');
  console.log('========================================');
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Server: http://${HOST}:${PORT}`);
  console.log(`  Health: http://${HOST}:${PORT}/health`);
  console.log(`  API: http://${HOST}:${PORT}/api`);
  console.log('========================================');
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[Server] Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

export default server;
