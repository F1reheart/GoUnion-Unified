export const notFoundHandler = (req, res) => {
  res.status(404).json({ detail: `Route ${req.method} ${req.originalUrl} not found.` });
};

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  
  if (status >= 500) {
    console.error("CRITICAL ROUTE ERROR:", err.stack);
  } else {
    console.error(`Route Error (${status}):`, err.message);
  }

  res.status(status).json({
    detail: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
