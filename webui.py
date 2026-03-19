#!/usr/bin/env python3
"""
Web UI for Open-AutoGLM - Gradio-based interface for phone automation.
 redesigned with modern UI/UX
"""

import os
import sys
import io
import threading
import re
import json
import yaml
import gradio as gr


# Global variables
main_output = []
output_lock = threading.Lock()
config = {
    "api_key": "",
    "device_type": "adb",
    "device_id": "",
    "lang": "cn",
}
is_running = False
agent_instance = None


# Custom CSS for animations and styling
CUSTOM_CSS = """
<style>
/* Button hover effects */
.gr-button {
    transition: all 0.3s ease !important;
}

.gr-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

.gr-button:disabled {
    transform: none;
    opacity: 0.6;
}

/* Loading spinner animation */
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
}

/* Card styling */
.gr-box {
    border-radius: 12px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
    transition: box-shadow 0.3s ease !important;
}

.gr-box:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
}

/* Input focus effects */
.gr-input:focus, .gr-textbox:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
}

/* Log output styling */
.log-output {
    font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
    font-size: 13px !important;
    line-height: 1.6 !important;
    background: #f9fafb !important;
    border-radius: 8px !important;
    border: 1px solid #e5e7eb !important;
    color: #1f2937 !important;
}

/* Tab styling */
.gr-tabs .tab-nav {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px 8px 0 0;
}

/* Accordion styling for config */
#config-accordion {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    max-width: 350px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

#config-accordion .label-wrap {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    padding: 10px 16px;
}

/* Pulse animation for running state */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

.running-indicator {
    animation: pulse 1.5s ease-in-out infinite;
}

/* Header gradient text */
.header-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* Larger page width and height */
.gr-container {
    max-width: 1400px !important;
    margin: 0 auto !important;
}

/* Larger Tab title font */
.gr-tabs .tab-nav button {
    font-size: 18px !important;
    font-weight: 600 !important;
}

/* Hide footer */
footer, .gr-footer {
    display: none !important;
}

/* Shift+Enter for newline, Enter for submit */
.task-input textarea {
    resize: none;
    height: 80px !important;
    min-height: 80px !important;
}
</style>

<script>
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            const taskInput = document.querySelector('.task-input textarea');
            if (taskInput) {
                taskInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const submitBtn = document.querySelector('.run-btn button');
                        if (submitBtn && !submitBtn.disabled) {
                            submitBtn.click();
                        }
                    }
                });
            }
        }, 1000);
    });
})();
</script>
"""


def create_ui() -> gr.Blocks:
    """Create the Gradio UI with modern design."""

    with gr.Blocks(
        title="Open-AutoGLM Web 界面",
    ) as ui:

        # Header with gear button
        with gr.Row(elem_classes="header-row"):
            gr.HTML("""
                <div style="padding: 20px 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 2.5em; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        🤖 Open-AutoGLM Web 界面
                    </h1>
                    <p style="color: #666; margin-top: 8px;">AI 驱动的手机自动化界面</p>
                </div>
            """)

        # Config section (shown as collapsible)
        with gr.Accordion("⚙️ 配置设置", open=False, elem_id="config-accordion") as config_accordion:
            gr.Markdown("### 智谱 AI 配置")

            with gr.Group():
                api_key_input = gr.Textbox(
                    label="🔑 智谱 API Key",
                    placeholder="请输入你的智谱 API Key",
                    type="password",
                    value=config["api_key"],
                    elem_classes="config-input",
                )

                device_type_input = gr.Radio(
                    label="📱 设备类型",
                    choices=[("Android (ADB)", "adb"), ("HarmonyOS (HDC)", "hdc"), ("iPhone (iOS)", "ios")],
                    value=config["device_type"],
                    elem_classes="config-input",
                )

                device_id_input = gr.Textbox(
                    label="🔌 设备 ID（可选，留空自动检测）",
                    placeholder="例如：emulator-5554",
                    value=config["device_id"],
                    elem_classes="config-input",
                )

                lang_input = gr.Radio(
                    label="🌐 语言",
                    choices=[("简体中文", "cn"), ("English", "en")],
                    value=config["lang"],
                    elem_classes="config-input",
                )

                save_config_btn = gr.Button("💾 保存配置", variant="primary", size="lg")
                config_status = gr.HTML(
                    value='<div style="padding: 10px; background: #f0f0f0; border-radius: 8px; text-align: center; color: #666;">等待配置...</div>',
                    label="配置状态",
                    visible=True,
                )

        # Main content with tabs
        with gr.Tabs(elem_id="main-tabs"):

            # Tab 1: Task Execution
            with gr.TabItem("📝 任务执行", elem_id="tab-task"):
                with gr.Row(equal_height=True):
                    # Left: Task Input
                    with gr.Column(scale=1, elem_classes="input-column"):
                        gr.Markdown("### 🎯 任务描述")

                        task_input = gr.Textbox(
                            label="",
                            placeholder="请输入任务，例如：打开微信并发送消息给张三",
                            lines=1,
                            elem_classes="task-input",
                            show_label=False,
                        )

                        with gr.Row():
                            run_btn = gr.Button(
                                "▶️ 执行任务",
                                variant="primary",
                                size="lg",
                                interactive=False,
                                elem_classes="run-btn",
                            )
                            clear_btn = gr.Button(
                                "🗑️ 清空日志",
                                size="lg",
                                interactive=True,
                                elem_classes="clear-btn",
                            )

                        # Status indicator
                        status_indicator = gr.HTML(
                            value='<div style="padding: 12px; background: #f0f0f0; border-radius: 8px; text-align: center; color: #666;">就绪</div>',
                            label="状态",
                        )

                    # Right: Log Output
                    with gr.Column(scale=1, elem_classes="log-column"):
                        gr.Markdown("### 📋 运行日志")

                        output_display = gr.HTML(
                            label="",
                            elem_classes="log-output",
                            show_label=False,
                            value='<div style="padding: 20px;"><div style="color: #9ca3af; text-align: center; padding: 40px 0;">等待任务执行...</div></div>',
                        )

            # Tab 2: YAML Upload
            with gr.TabItem("📄 YAML 导入", elem_id="tab-yaml"):
                with gr.Row(equal_height=True):
                    # Left: File Upload and Preview
                    with gr.Column(scale=1):
                        gr.Markdown("### 📤 上传 YAML 文件")

                        yaml_file = gr.File(
                            label="选择 YAML 文件",
                            file_types=[".yaml", ".yml"],
                            elem_classes="yaml-upload",
                        )

                        yaml_preview = gr.Code(
                            label="YAML 内容预览",
                            language="yaml",
                            lines=20,
                            interactive=False,
                            elem_classes="yaml-preview",
                        )

                        parse_status = gr.Textbox(
                            label="解析状态",
                            interactive=False,
                        )

                        load_yaml_btn = gr.Button(
                            "📥 加载任务到输入框",
                            variant="primary",
                            size="lg",
                            interactive=False,
                        )

                    # Right: Log Output (shared)
                    with gr.Column(scale=1):
                        gr.Markdown("### 📋 运行日志")

                        yaml_log_display = gr.Textbox(
                            label="",
                            lines=30,
                            interactive=False,
                            elem_classes="log-output",
                            show_label=False,
                            value="等待 YAML 文件上传...\n" + "=" * 50,
                        )

        # ========== Event Handlers ==========

        def update_config(api_key, device_type, device_id, lang):
            """Save configuration and connect to Open-AutoGLM service."""
            global config, agent_instance

            if not api_key or not api_key.strip():
                return '<div style="padding: 12px; background: #fee; border: 2px solid #fcc; border-radius: 8px; text-align: center; color: #c00; font-weight: bold;">❌ 请输入 API Key</div>'

            config["api_key"] = api_key
            config["device_type"] = device_type
            config["device_id"] = device_id
            config["lang"] = lang

            # Try to initialize the agent
            try:
                from phone_agent import PhoneAgent
                from phone_agent.agent import AgentConfig
                from phone_agent.agent_ios import IOSAgentConfig, IOSPhoneAgent
                from phone_agent.model import ModelConfig
                from phone_agent.device_factory import DeviceType, set_device_type

                base_url = "https://open.bigmodel.cn/api/paas/v4"
                model = "autoglm-phone"

                # Set device type
                if device_type == "adb":
                    dev_type = DeviceType.ADB
                elif device_type == "hdc":
                    dev_type = DeviceType.HDC
                else:
                    dev_type = DeviceType.IOS

                if dev_type != DeviceType.IOS:
                    set_device_type(dev_type)

                # Create model config
                model_config = ModelConfig(
                    base_url=base_url,
                    model_name=model,
                    api_key=api_key,
                    lang=lang,
                )

                # Create agent
                if dev_type == DeviceType.IOS:
                    agent_config = IOSAgentConfig(
                        max_steps=100,
                        device_id=device_id if device_id else None,
                        verbose=False,
                        lang=lang,
                    )
                    agent_instance = IOSPhoneAgent(model_config=model_config, agent_config=agent_config)
                else:
                    agent_config = AgentConfig(
                        max_steps=100,
                        device_id=device_id if device_id else None,
                        verbose=False,
                        lang=lang,
                    )
                    agent_instance = PhoneAgent(model_config=model_config, agent_config=agent_config)

                status = f'''
                    <div style="padding: 15px; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #059669; border-radius: 12px; text-align: center; color: #065f46; box-shadow: 0 4px 12px rgba(5,150,105,0.2);">
                        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 8px;">✅ 配置已保存并连接成功!</div>
                        <div style="font-size: 0.9em; line-height: 1.8;">
                            <div>🔑 API Key: {api_key[:8]}...{api_key[-4:]}</div>
                            <div>📱 设备：{device_type.upper()}</div>
                            <div>🌐 语言：{"简体中文" if lang == "cn" else "English"}</div>
                        </div>
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(6,95,70,0.2); font-weight: bold;">
                            🎉 可以开始执行任务了!
                        </div>
                    </div>
                '''

            except Exception as e:
                status = f'''
                    <div style="padding: 12px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; text-align: center; color: #92400e;">
                        <div style="font-weight: bold; margin-bottom: 5px;">⚠️ 配置已保存，但连接服务失败</div>
                        <div style="font-size: 0.9em; color: #78350f;">{str(e)}</div>
                    </div>
                '''

            return status

        def update_button_state(task):
            """Update run button state based on task input."""
            global is_running

            if is_running:
                return gr.update(interactive=False, value="⏳ 执行中...")

            if task and task.strip():
                return gr.update(interactive=True, value="▶️ 执行任务")
            else:
                return gr.update(interactive=False, value="▶️ 执行任务")

        def parse_yaml_file(file_path):
            """Parse uploaded YAML file."""
            if file_path is None:
                return "", "❌ 请先上传文件", gr.update(interactive=False)

            try:
                with open(file_path.name, 'r', encoding='utf-8') as f:
                    content = yaml.safe_load(f)

                yaml_str = yaml.dump(content, allow_unicode=True, default_flow_style=False)
                return yaml_str, f"✅ 解析成功 | 任务数：{len(content.get('tasks', [])) if isinstance(content, dict) else 1}", gr.update(interactive=True)
            except Exception as e:
                return "", f"❌ 解析失败：{str(e)}", gr.update(interactive=False)

        def load_yaml_to_task(yaml_content):
            """Load YAML task to task input."""
            if not yaml_content:
                return ""

            try:
                content = yaml.safe_load(yaml_content)
                if isinstance(content, dict) and 'tasks' in content:
                    tasks = content['tasks']
                    if tasks:
                        return str(tasks[0]) if isinstance(tasks[0], str) else yaml.dump(tasks[0], allow_unicode=True)
                elif isinstance(content, str):
                    return content
                else:
                    return yaml.dump(content, allow_unicode=True)
            except:
                return yaml_content

        def run_task(task):
            """Run a task using the agent with clean output."""
            global main_output, is_running, config, agent_instance

            if not task or not task.strip():
                return (
                    "❌ 请输入任务",
                    gr.update(interactive=True, value="▶️ 执行任务"),
                    '<div style="padding: 12px; background: #fee; border-radius: 8px; text-align: center; color: #c00;">请输入任务内容</div>',
                )

            if not config["api_key"]:
                return (
                    "❌ 请先在配置中设置 API Key（点击 ⚙️ 图标）",
                    gr.update(interactive=True, value="▶️ 执行任务"),
                    '<div style="padding: 12px; background: #fee; border-radius: 8px; text-align: center; color: #c00;">请先配置 API Key</div>',
                )

            # Check if agent is initialized
            if agent_instance is None:
                return (
                    "❌ 请先保存配置以连接服务",
                    gr.update(interactive=True, value="▶️ 执行任务"),
                    '<div style="padding: 12px; background: #fee; border-radius: 8px; text-align: center; color: #c00;">请先保存配置</div>',
                )

            is_running = True

            # Initialize output
            with output_lock:
                main_output = []
                main_output.append('<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px;">📋 任务：' + task + '</div>')
                main_output.append('<div style="color: #6b7280; font-size: 12px; margin-bottom: 15px;">🔧 配置：设备=' + config['device_type'].upper() + ' | 语言=' + config['lang'] + '</div>')
                main_output.append('<div style="color: #059669; font-weight: 600; margin-bottom: 10px;">[1] 初始化 Agent...</div>')

            yield (
                "\n".join(main_output),
                gr.update(interactive=False, value="⏳ 执行中..."),
                '<div class="running-indicator" style="padding: 12px; background: #fef3c7; border-radius: 8px; text-align: center; color: #d97706;">⏳ 任务执行中...</div>',
            )

            try:
                # Use the pre-initialized agent instance
                with output_lock:
                    main_output.append('<div style="color: #059669; margin: 8px 0; padding-left: 20px;">✅ 状态：就绪</div>')
                    main_output.append('<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin: 10px 0;"></div>')
                    main_output.append('<div style="color: #059669; font-weight: 600; margin-bottom: 10px;">[2] 执行任务...</div>')

                yield (
                    "\n".join(main_output),
                    gr.update(interactive=False, value="⏳ 执行中..."),
                    '<div class="running-indicator" style="padding: 12px; background: #fef3c7; border-radius: 8px; text-align: center; color: #d97706;">⏳ 任务执行中...</div>',
                )

                # Suppress stdout
                old_stdout = sys.stdout
                sys.stdout = io.StringIO()

                try:
                    step_num = 0
                    result = None

                    while step_num < 100:
                        result = agent_instance.step(task if step_num == 0 else None)
                        step_num += 1

                        thinking = str(result.thinking)[:100] if result.thinking else ""
                        action_name = result.action.get('action', 'unknown') if result.action else 'none'

                        with output_lock:
                            main_output.append(f'<div style="margin: 8px 0; padding-left: 20px;"><span style="color: #059669; font-weight: bold; min-width: 80px; display: inline-block;">步骤 {step_num}</span> <span style="color: #6b7280;">→</span> <span style="font-weight: 500;">{action_name}</span></div>')
                            if thinking:
                                main_output.append(f'<div style="color: #9ca3af; font-size: 12px; padding-left: 100px; margin-top: -4px; margin-bottom: 8px;">💭 {thinking.strip()}</div>')

                        yield (
                            "\n".join(main_output),
                            gr.update(interactive=False, value="⏳ 执行中..."),
                            '<div class="running-indicator" style="padding: 12px; background: #fef3c7; border-radius: 8px; text-align: center; color: #d97706;">⏳ 任务执行中...</div>',
                        )

                        if result.finished:
                            break

                    sys.stdout = old_stdout

                    # Final result
                    with output_lock:
                        main_output.append('<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin: 10px 0;"></div>')
                        main_output.append('<div style="color: #059669; font-weight: 600; font-size: 1.1em; margin-bottom: 10px;">[3] ✅ 任务完成</div>')
                        main_output.append(f'<div style="margin: 8px 0; padding-left: 20px;">总步骤：<span style="font-weight: 500;">{step_num}</span></div>')
                        result_text = result.message if result else 'N/A'
                        main_output.append(f'<div style="margin: 8px 0; padding-left: 20px;">结果：<span style="color: #6b7280;">{result_text}</span></div>')
                        main_output.append('<div style="border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 15px; color: #9ca3af; font-size: 12px;">=' + '=' * 58 + '</div>')

                    agent_instance.reset()

                except Exception as e:
                    sys.stdout = old_stdout
                    raise e

            except Exception as e:
                import traceback
                error_msg = str(e)
                error_trace = traceback.format_exc()
                with output_lock:
                    main_output.append('<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin: 10px 0;"></div>')
                    main_output.append(f'<div style="color: #dc2626; font-weight: 600; margin-bottom: 10px;">[错误] ❌ {error_msg}</div>')
                    main_output.append(f'<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; font-size: 12px; color: #991b1b; white-space: pre-wrap; font-family: monospace;">{error_trace}</div>')
                    main_output.append('<div style="border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 15px; color: #9ca3af; font-size: 12px;">=' + '=' * 58 + '</div>')

            is_running = False
            yield (
                "\n".join(main_output),
                gr.update(interactive=True, value="▶️ 执行任务"),
                '<div style="padding: 12px; background: #d1fae5; border-radius: 8px; text-align: center; color: #059669;">✅ 任务已完成</div>',
            )

        def clear_logs():
            """Clear the log display."""
            global main_output
            main_output = []
            return '<div style="padding: 20px;"><div style="color: #9ca3af; text-align: center; padding: 40px 0;">等待任务执行...</div></div>'

        def clear_yaml_logs():
            """Clear the YAML tab log display."""
            return "等待 YAML 文件上传...\n" + "=" * 50

        # ========== Event Bindings ==========

        # Config modal save
        save_config_btn.click(
            fn=update_config,
            inputs=[api_key_input, device_type_input, device_id_input, lang_input],
            outputs=config_status,
        )

        # Task input change -> update button state
        task_input.change(
            fn=update_button_state,
            inputs=task_input,
            outputs=run_btn,
        )

        # Run button click
        run_btn.click(
            fn=run_task,
            inputs=[task_input],
            outputs=[output_display, run_btn, status_indicator],
        )

        # Enter key to run task (same as clicking the button)
        task_input.submit(
            fn=run_task,
            inputs=[task_input],
            outputs=[output_display, run_btn, status_indicator],
        )

        # Clear logs
        clear_btn.click(
            fn=clear_logs,
            inputs=None,
            outputs=output_display,
        )

        # YAML file upload
        yaml_file.change(
            fn=parse_yaml_file,
            inputs=yaml_file,
            outputs=[yaml_preview, parse_status, load_yaml_btn],
        )

        # Load YAML to task
        load_yaml_btn.click(
            fn=load_yaml_to_task,
            inputs=yaml_preview,
            outputs=task_input,
        )

    return ui


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Open-AutoGLM Web UI")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=7860, help="Port to listen on")
    parser.add_argument("--share", action="store_true", help="Create public share link")
    parser.add_argument("--inbrowser", action="store_true", help="Open in browser automatically")

    args = parser.parse_args()

    ui = create_ui()
    ui.launch(
        server_name=args.host,
        server_port=args.port,
        share=args.share,
        inbrowser=args.inbrowser,
        css=CUSTOM_CSS,
    )


if __name__ == "__main__":
    main()
