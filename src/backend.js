function getExtensionProperties(ctx) {
  return ctx.currentUser && ctx.currentUser.extensionProperties && ctx.currentUser.extensionProperties;
}

function defaultSavedBlocks() {
  return {
    summaryChunks: [],
    preconditions: '',
    steps: [],
    additionalInfo: ''
  };
}

function isSavedBlocks(value) {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.summaryChunks) &&
    typeof value.preconditions === 'string' &&
    Array.isArray(value.steps) &&
    typeof value.additionalInfo === 'string'
  );
}

exports.httpHandler = {
  endpoints: [
    {
      method: 'GET',
      path: 'saved-blocks',
      handle: function handle(ctx) {
        const props = getExtensionProperties(ctx);

        let result;
        if (!props || !props.savedBlocks) {
          result = defaultSavedBlocks();
        } else {
          try {
            const parsed = JSON.parse(props.savedBlocks);
            if (isSavedBlocks(parsed)) {
              result = parsed;
            } else {
              ctx.response.json({
                error: 'Saved blocks data has an unexpected format.'
              });
              return;
            }
          } catch (e) {
            ctx.response.json({
              error: 'Failed to parse saved blocks from storage.'
            });
            return;
          }
        }

        ctx.response.json(result);
      }
    },
    {
      method: 'POST',
      path: 'saved-blocks',
      handle: function handle(ctx) {
        const payload = ctx.request.json();
        const props = getExtensionProperties(ctx);

        if (!isSavedBlocks(payload)) {
          ctx.response.json({
            error: 'Invalid payload for saved blocks.'
          });
          return;
        }

        if (props) {
          props.savedBlocks = JSON.stringify(payload);
        }

        ctx.response.json(JSON.parse(props.savedBlocks));
      }
    }
  ]
};
