function getExtensionProperties(ctx) {
  return ctx.currentUser && ctx.currentUser.extensionProperties && ctx.currentUser.extensionProperties;
}

exports.httpHandler = {
  endpoints: [
    {
      method: 'GET',
      path: 'debug',
      handle: function handle(ctx) {
        // See https://www.jetbrains.com/help/youtrack/devportal-apps/apps-reference-http-handlers.html#request
        const requestParam = ctx.request.getParameter('test');
        // See https://www.jetbrains.com/help/youtrack/devportal-apps/apps-reference-http-handlers.html#response
        ctx.response.json({test: requestParam});
      }
    },
    {
      method: 'GET',
      path: 'saved-blocks',
      handle: function handle(ctx) {
        return JSON.parse(getExtensionProperties(ctx).savedBlocks);
      }
    },
    {
      method: 'POST',
      path: 'saved-blocks',
      handle: function handle(ctx) {
        const payload = ctx.request.json();
        getExtensionProperties(ctx).savedBlocks = JSON.stringify(payload);
        return JSON.parse(getExtensionProperties(ctx).savedBlocks);
      }
    }
  ]
};
