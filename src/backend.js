function getExtensionProperties(ctx) {
  return ctx.currentUser && ctx.currentUser.extensionProperties && ctx.currentUser.extensionProperties;
}

function defaultSavedBlocks() {
  return {
    summary: [],
    preconditions: [],
    steps: []
  };
}

function defaultOutputFormats() {
  return {
    activeFormat: 'markdown_default',
    formats: []
  };
}

function defaultViewMode() {
  return {viewMode: 'wide'};
}

function defaultColorScheme() {
  return {colorScheme: 'blue'};
}

function defaultUiPreferences() {
  return {
    viewMode: defaultViewMode().viewMode,
    colorScheme: defaultColorScheme().colorScheme
  };
}

function isRecord(value) {
  return !!value && typeof value === 'object';
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSavedBlocks(value) {
  if (!isRecord(value)) {
    return null;
  }

  // Canonical format (current)
  if (Array.isArray(value.summary) && Array.isArray(value.preconditions) && Array.isArray(value.steps)) {
    return {
      summary: arrayOrEmpty(value.summary),
      preconditions: arrayOrEmpty(value.preconditions),
      steps: arrayOrEmpty(value.steps)
    };
  }

  return null;
}

function normalizeOutputFormats(value) {
  if (!isRecord(value)) {
    return null;
  }

  const activeFormat = normalizeActiveFormat(value.activeFormat);
  const formats = normalizeFormatsList(value.formats);

  return {activeFormat, formats};
}

function normalizeActiveFormat(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    return 'markdown_default';
  }

  return value;
}

function normalizeFormatsList(raw) {
  const formatsRaw = Array.isArray(raw) ? raw : [];
  const formats = [];

  for (const item of formatsRaw) {
    const normalized = normalizeFormatItem(item);
    if (normalized) {
      formats.push(normalized);
    }
  }

  return formats;
}

function normalizeFormatItem(item) {
  if (!isRecord(item)) {
    return null;
  }
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const template = typeof item.template === 'string' ? item.template : '';

  if (!id || !name) {
    return null;
  }

  return {id, name, template};
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
            const normalized = normalizeSavedBlocks(parsed);
            if (normalized) {
              result = normalized;
            } else {
              ctx.response.json({
                error: 'Saved blocks data has an unexpected format.'
              });
              return;
            }
          } catch {
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

        const normalized = normalizeSavedBlocks(payload);

        if (!normalized) {
          ctx.response.json({
            error: 'Invalid payload for saved blocks.'
          });
          return;
        }

        if (props) {
          props.savedBlocks = JSON.stringify(normalized);
        }

        ctx.response.json(normalized);
      }
    },
    {
      method: 'GET',
      path: 'output-formats',
      handle: function handle(ctx) {
        const props = getExtensionProperties(ctx);

        let result;
        if (!props || !props.outputFormats) {
          result = defaultOutputFormats();
        } else {
          try {
            const parsed = JSON.parse(props.outputFormats);
            const normalized = normalizeOutputFormats(parsed);
            if (normalized) {
              result = normalized;
            } else {
              ctx.response.json({
                error: 'Output formats data has an unexpected format.'
              });
              return;
            }
          } catch {
            ctx.response.json({
              error: 'Failed to parse output formats from storage.'
            });
            return;
          }
        }

        ctx.response.json(result);
      }
    },
    {
      method: 'POST',
      path: 'output-formats',
      handle: function handle(ctx) {
        const payload = ctx.request.json();
        const props = getExtensionProperties(ctx);

        const normalized = normalizeOutputFormats(payload);
        if (!normalized) {
          ctx.response.json({
            error: 'Invalid payload for output formats.'
          });
          return;
        }

        if (props) {
          props.outputFormats = JSON.stringify(normalized);
        }

        ctx.response.json(normalized);
      }
    },
    {
      method: 'GET',
      path: 'view-mode',
      handle: function handle(ctx) {
        const props = getExtensionProperties(ctx);

        if (!props || typeof props.fixedViewMode !== 'boolean') {
          ctx.response.json(defaultViewMode());
          return;
        }

        ctx.response.json({viewMode: props.fixedViewMode ? 'fixed' : 'wide'});
      }
    },
    {
      method: 'GET',
      path: 'ui-preferences',
      handle: function handle(ctx) {
        const props = getExtensionProperties(ctx);

        const viewMode = props && typeof props.fixedViewMode === 'boolean' ? (props.fixedViewMode ? 'fixed' : 'wide') : null;
        const scheme = props && typeof props.colorScheme === 'string' ? props.colorScheme : null;

        const normalizedScheme = scheme === 'blue' || scheme === 'magenta' ? scheme : null;

        ctx.response.json({
          viewMode: viewMode || defaultUiPreferences().viewMode,
          colorScheme: normalizedScheme || defaultUiPreferences().colorScheme
        });
      }
    },
    {
      method: 'POST',
      path: 'ui-preferences',
      handle: function handle(ctx) {
        const payload = ctx.request.json();
        const props = getExtensionProperties(ctx);

        const viewMode = payload && typeof payload.viewMode === 'string' ? payload.viewMode : '';
        const scheme = payload && typeof payload.colorScheme === 'string' ? payload.colorScheme : '';

        if (viewMode !== 'fixed' && viewMode !== 'wide') {
          ctx.response.json({
            error: 'Invalid payload for UI preferences (view mode).'
          });
          return;
        }
        if (scheme !== 'blue' && scheme !== 'magenta') {
          ctx.response.json({
            error: 'Invalid payload for UI preferences (color scheme).'
          });
          return;
        }

        if (props) {
          props.fixedViewMode = viewMode === 'fixed';
          props.colorScheme = scheme;
        }

        ctx.response.json({viewMode, colorScheme: scheme});
      }
    }
  ]
};
