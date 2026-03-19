const SAFE_ACTIONS = [
  'append_text',
  'prepend_text',
  'replace_text',
  'write_if_missing',
  'append_timestamped_note',
];

const MATCH_TYPES = ['contains', 'contains_any', 'contains_all', 'not_contains', 'regex'];

export function createDefaultWorkspacePayload({ id, name }) {
  const wechatTargetId = 'wechat-chat-input';
  const socialTargetId = 'social-interaction-input';
  const wechatProfileId = 'wechat-chat-ocr';
  const socialProfileId = 'social-input-ocr';
  const wechatScenarioId = 'wechat-monitor-reply';
  const socialScenarioId = 'auto-like-interaction';

  return {
    metadata: {
      id,
      name,
      version: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      safeActions: SAFE_ACTIONS,
      matchTypes: MATCH_TYPES,
    },
    targets: [
      {
        id: wechatTargetId,
        name: 'WeChat Chat Monitor',
        description: 'WeChat desktop monitor target for OCR-only detection and logging.',
        target_bundle: {
          name: wechatTargetId,
          window_matcher: {
            window_title_substring: '',
            window_title: '',
            process_name: 'Weixin',
          },
          focus_strategy: {
            type: 'activate_then_wait',
            wait_timeout_seconds: 1,
            settle_delay_ms: 100,
          },
          control_strategy: {
            type: 'control_text',
            control_name: '',
            control_type: '',
          },
          readback_strategy: {
            type: 'window_text',
            focus_strategy: {
              type: 'activate_then_wait',
              wait_timeout_seconds: 1,
              settle_delay_ms: 100,
            },
          },
          default_ocr_profile: wechatProfileId,
          roi_presets: {
            recent_message_region: {
              x: 20,
              y: 120,
              width: 560,
              height: 620,
            },
          },
        },
      },
      {
        id: socialTargetId,
        name: 'Social Interaction Input',
        description: 'Text-only interaction target for apps or pages that expose an editable input control.',
        target_bundle: {
          name: socialTargetId,
          window_matcher: {
            window_title_substring: '\u4e92\u52a8',
            window_title: '\u4e92\u52a8\u8f93\u5165\u6846',
            process_name: '',
          },
          focus_strategy: {
            type: 'focus_control_direct',
            wait_timeout_seconds: 1,
            settle_delay_ms: 100,
          },
          control_strategy: {
            type: 'control_text',
            control_name: 'Edit1',
            control_type: 'Win32Edit',
          },
          readback_strategy: {
            type: 'control_text',
            focus_strategy: {
              type: 'focus_control_direct',
              wait_timeout_seconds: 1,
              settle_delay_ms: 100,
            },
          },
          default_ocr_profile: socialProfileId,
          roi_presets: {},
        },
      },
    ],
    profiles: [
      {
        id: wechatProfileId,
        name: 'WeChat Chat OCR',
        profile_key: wechatProfileId,
        roi: {
          x: 20,
          y: 120,
          width: 560,
          height: 620,
        },
        preprocessing: {
          grayscale: true,
          scale: 2.2,
          threshold: {
            enabled: false,
            value: 180,
          },
          trim_border: {
            enabled: false,
            margin: 0,
          },
        },
        normalization: {
          collapse_whitespace: true,
          preserve_line_breaks: true,
          case: 'none',
          simple_noise_cleanup: true,
        },
        behavior: {
          fallback_to_full_window_on_empty: true,
        },
        watch: {
          enabled: true,
          polling_interval_seconds: 0.5,
          max_checks: 2,
          change_threshold: 0.004,
          forced_ocr_interval_seconds: 5,
          consecutive_match_count: 1,
        },
      },
      {
        id: socialProfileId,
        name: 'Social Input OCR',
        profile_key: socialProfileId,
        roi: null,
        preprocessing: {
          grayscale: true,
          scale: 2,
          threshold: {
            enabled: false,
            value: 180,
          },
          trim_border: {
            enabled: false,
            margin: 0,
          },
        },
        normalization: {
          collapse_whitespace: true,
          preserve_line_breaks: false,
          case: 'lower',
          simple_noise_cleanup: true,
        },
        watch: {
          enabled: true,
          polling_interval_seconds: 0.5,
          max_checks: 1,
          change_threshold: 0.005,
          forced_ocr_interval_seconds: 5,
          consecutive_match_count: 1,
        },
      },
    ],
    scenarios: [
      {
        id: wechatScenarioId,
        name: '\u5fae\u4fe1\u76d1\u63a7\u65e5\u5fd7',
        description: 'Monitor WeChat chat content and classify plain chat text, cards/articles, and image-like messages. Current WeChat desktop builds may not expose a safe control-targeted input field.',
        targetRef: wechatTargetId,
        ocrProfileRef: wechatProfileId,
        logOnly: true,
        rules: [
          {
            id: 'rule-wechat-chat-text',
            name: '\u68c0\u6d4b\u5230\u804a\u5929\u6b63\u6587\u540e\u8bb0\u5f55\u65e5\u5fd7',
            enabled: true,
            logOnly: true,
            condition: {
              id: 'condition-wechat-chat-text',
              type: 'regex',
              pattern: '[\\u4e00-\\u9fff]{2,}',
            },
            action: {
              id: 'action-wechat-chat-text',
              type: 'append_timestamped_note',
              text: '\u68c0\u6d4b\u5230\u804a\u5929\u6587\u672c',
            },
            targetRef: wechatTargetId,
            ocrProfileRef: wechatProfileId,
            match: {
              type: 'regex',
              pattern: '[\\u4e00-\\u9fff]{2,}',
            },
          },
          {
            id: 'rule-wechat-card-article',
            name: '\u68c0\u6d4b\u5230\u5361\u7247\u6216\u516c\u4f17\u53f7\u6587\u7ae0\u540e\u8bb0\u5f55\u65e5\u5fd7',
            enabled: true,
            logOnly: true,
            condition: {
              id: 'condition-wechat-card-article',
              type: 'regex',
              pattern: '小程序|公众号|文章|名片|请查收|优惠券|卡片|查看全文|阅读',
            },
            action: {
              id: 'action-wechat-card-article',
              type: 'append_timestamped_note',
              text: '\u68c0\u6d4b\u5230\u5361\u7247\u6216\u6587\u7ae0',
            },
            targetRef: wechatTargetId,
            ocrProfileRef: wechatProfileId,
            match: {
              type: 'regex',
              pattern: '小程序|公众号|文章|名片|请查收|优惠券|卡片|查看全文|阅读',
            },
          },
          {
            id: 'rule-wechat-reply',
            name: '\u68c0\u6d4b\u5230\u56de\u590d\u5173\u952e\u8bcd\u540e\u8bb0\u5f55\u65e5\u5fd7',
            enabled: true,
            logOnly: true,
            condition: {
              id: 'condition-wechat-reply',
              type: 'contains_any',
              values: ['\u56de\u590d', '\u5728\u5417', '\u6536\u5230\u8bf7\u56de\u590d', '\u8bf7\u56de'],
            },
            action: {
              id: 'action-wechat-reply',
              type: 'append_timestamped_note',
              text: '\u68c0\u6d4b\u5230\u56de\u590d\u5173\u952e\u8bcd',
            },
            targetRef: wechatTargetId,
            ocrProfileRef: wechatProfileId,
            match: {
              type: 'contains_any',
              values: ['\u56de\u590d', '\u5728\u5417', '\u6536\u5230\u8bf7\u56de\u590d', '\u8bf7\u56de'],
            },
          },
        ],
      },
      {
        id: socialScenarioId,
        name: '\u81ea\u52a8\u70b9\u8d5e/\u4e92\u52a8',
        description: 'Mouse-only likes remain blocked. If OCR detects interaction prompts on a text-capable surface, write "\u5df2\u8d5e" or a safe guidance note.',
        targetRef: socialTargetId,
        ocrProfileRef: socialProfileId,
        rules: [
          {
            id: 'rule-social-like',
            name: '\u68c0\u6d4b\u70b9\u8d5e\u63d0\u793a\u540e\u5199\u5165\u5df2\u8d5e\u6587\u672c',
            enabled: true,
            condition: {
              id: 'condition-social-like',
              type: 'contains_any',
              values: ['\u70b9\u8d5e', 'like', '\u652f\u6301\u4e00\u4e0b'],
            },
            action: {
              id: 'action-social-like',
              type: 'write_if_missing',
              text: '\u5df2\u8d5e',
            },
            targetRef: socialTargetId,
            ocrProfileRef: socialProfileId,
            match: {
              type: 'contains_any',
              values: ['\u70b9\u8d5e', 'like', '\u652f\u6301\u4e00\u4e0b'],
            },
          },
          {
            id: 'rule-social-warning',
            name: '\u63d0\u793a\u5b89\u5168\u8fb9\u754c',
            enabled: true,
            condition: {
              id: 'condition-social-warning',
              type: 'regex',
              pattern: '\u70b9\u8d5e|like',
            },
            action: {
              id: 'action-social-warning',
              type: 'append_timestamped_note',
              text: '\u56e0\u5b89\u5168\u9650\u5236\u6682\u4e0d\u652f\u6301\u7eaf\u9f20\u6807\u70b9\u8d5e\uff0c\u53ef\u6539\u4e3a\u6587\u672c\u4e92\u52a8\u3002',
            },
            targetRef: socialTargetId,
            ocrProfileRef: socialProfileId,
            match: {
              type: 'regex',
              pattern: '\u70b9\u8d5e|like',
            },
          },
        ],
      },
    ],
  };
}

export { MATCH_TYPES, SAFE_ACTIONS };
