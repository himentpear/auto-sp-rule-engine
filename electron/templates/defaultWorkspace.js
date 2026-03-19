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
      version: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      safeActions: SAFE_ACTIONS,
      matchTypes: MATCH_TYPES,
    },
    targets: [
      {
        id: wechatTargetId,
        name: 'WeChat Chat Input',
        description: 'WeChat desktop chat input control used for safe preset replies after OCR keyword matches.',
        target_bundle: {
          name: wechatTargetId,
          window_matcher: {
            window_title_substring: 'WeChat',
            window_title: 'WeChat',
            process_name: 'WeChat',
          },
          focus_strategy: {
            type: 'focus_control_direct',
            wait_timeout_seconds: 1,
            settle_delay_ms: 100,
          },
          control_strategy: {
            type: 'control_text',
            control_name: 'RichEdit50W1',
            control_type: 'RichEdit',
          },
          readback_strategy: {
            type: 'control_text',
            focus_strategy: {
              type: 'focus_control_direct',
              wait_timeout_seconds: 1,
              settle_delay_ms: 100,
            },
          },
          default_ocr_profile: wechatProfileId,
          roi_presets: {
            recent_message_region: {
              x: 520,
              y: 110,
              width: 460,
              height: 520,
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
          x: 520,
          y: 110,
          width: 460,
          height: 520,
        },
        preprocessing: {
          grayscale: true,
          scale: 2.2,
          threshold: {
            enabled: true,
            value: 188,
          },
          trim_border: {
            enabled: true,
            margin: 2,
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
        name: '\u5fae\u4fe1\u76d1\u63a7\u56de\u590d',
        description: 'Monitor WeChat chat content. When OCR matches reply-oriented keywords, write a preset reply into the input control.',
        targetRef: wechatTargetId,
        ocrProfileRef: wechatProfileId,
        rules: [
          {
            id: 'rule-wechat-reply',
            name: '\u68c0\u6d4b\u5230\u56de\u590d\u5173\u952e\u8bcd\u540e\u5199\u5165\u9884\u8bbe\u56de\u590d',
            enabled: true,
            condition: {
              id: 'condition-wechat-reply',
              type: 'contains_any',
              values: ['\u56de\u590d', '\u5728\u5417', '\u6536\u5230\u8bf7\u56de\u590d', '\u8bf7\u56de'],
            },
            action: {
              id: 'action-wechat-reply',
              type: 'append_text',
              text: '\u5df2\u6536\u5230\uff0c\u6211\u7a0d\u540e\u56de\u590d\u4f60\u3002',
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
        description: 'Mouse-only likes remain blocked. If OCR detects interaction prompts on a text-capable surface, write "已赞" or a safe guidance note.',
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
