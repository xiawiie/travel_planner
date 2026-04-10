"""LLM服务模块"""

import os

from hello_agents import HelloAgentsLLM

# 全局LLM实例
_llm_instance = None


def get_llm() -> HelloAgentsLLM:
    """
    获取LLM实例(单例模式)

    Returns:
        HelloAgentsLLM实例
    """
    global _llm_instance

    if _llm_instance is None:
        timeout = int(os.getenv("LLM_TIMEOUT", "300"))
        max_tokens_env = os.getenv("LLM_MAX_TOKENS")
        max_tokens = int(max_tokens_env) if max_tokens_env else 8192
        _llm_instance = HelloAgentsLLM(timeout=timeout, max_tokens=max_tokens)

        print(f"✅ LLM服务初始化成功")
        print(f"   提供商: {_llm_instance.provider}")
        print(f"   模型: {_llm_instance.model}")

    return _llm_instance


def reset_llm():
    """重置LLM实例(用于测试或重新配置)"""
    global _llm_instance
    _llm_instance = None

