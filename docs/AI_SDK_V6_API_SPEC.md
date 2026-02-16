# AI SDK v6 流式聊天 API 规范

## 🔴 关键协议要求

### 1. **所有事件必须包含 `id` 字段**
每个 SSE 事件必须有唯一的 ID：
```sse
{
  "id": "evt_abc123",  // ✅ 必需
  "type": "text-delta",
  "textId": "text_1",
  "delta": "Hello"
}
```

### 2. **必须发送 start/end 事件**
遵循 start → delta → end 模式：
```
text-start → text-delta → text-delta → ... → text-end
reasoning-start → reasoning-delta → ... → reasoning-end
tool-call-start → tool-call-delta → tool-call-result
```

### 3. **响应头必须正确**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
x-vercel-ai-ui-message-stream: v1  # ✅ 关键！不是 x-vercel-ai-data-stream
```

### 4. **增量持久化**
- 前端会在每次事件后保存状态到 localStorage
- 避免连接断开时丢失数据
- 用户刷新页面后可恢复对话

---

## 📋 API 端点

### POST `/jobs/chat`

**请求格式：**
```sse
{
  "messages": [
    {
      "role": "user" | "assistant",
      "content": "string",
      "timestamp": "2024-01-22T10:00:00.000Z"
    }
  ],
  "context": {
    "jobId": 123,
    "resumeId": 5,
    "detectedJob": {
      "title": "Senior Software Engineer",
      "company": "Google",
      "url": "https://careers.google.com/jobs/123"
    }
  },
  "options": {
    "showThinking": true,
    "stream": true
  }
}
```

**响应头：**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
x-vercel-ai-ui-message-stream: v1
```

---

## 📡 SSE 事件格式

### 事件结构
```
data: {"id":"evt_123","type":"event-type",...}\n\n
```

每个事件之间用**两个换行符**分隔。

---

## 🎯 事件类型详解

### 1. message-start
```sse
data: {
  "id": "evt_1",
  "type": "message-start",
  "messageId": "msg_abc123",
  "role": "assistant",
  "timestamp": "2024-01-22T10:00:00.000Z"
}
```

### 2. reasoning-start / reasoning-delta / reasoning-end
```sse
data: {
  "id": "evt_2",
  "type": "reasoning-start",
  "reasoningId": "reason_1"
}

data: {
  "id": "evt_3",
  "type": "reasoning-delta",
  "reasoningId": "reason_1",
  "delta": "我需要先分析职位要求，"
}

data: {
  "id": "evt_4",
  "type": "reasoning-delta",
  "reasoningId": "reason_1",
  "delta": "然后与简历进行匹配..."
}

data: {
  "id": "evt_5",
  "type": "reasoning-end",
  "reasoningId": "reason_1",
  "content": "我需要先分析职位要求，然后与简历进行匹配..."
}
```

### 3. tool-call-start / tool-call-delta / tool-call-result
```sse
data: {
  "id": "evt_6",
  "type": "tool-call-start",
  "toolCallId": "call_1",
  "toolName": "jobs_search",
  "arguments": {
    "keywords": "software engineer",
    "location": "San Francisco"
  }
}

data: {
  "id": "evt_7",
  "type": "tool-call-delta",
  "toolCallId": "call_1",
  "status": "running",
  "progress": {
    "current": 3,
    "total": 12,
    "message": "正在搜索第 3/12 个职位..."
  }
}

data: {
  "id": "evt_8",
  "type": "tool-call-result",
  "toolCallId": "call_1",
  "result": "找到 12 个匹配的软件工程师职位",
  "isError": false,
  "data": {
    "count": 12,
    "preview": ["Senior SWE at Google", "Staff Engineer at Meta"]
  }
}
```

### 4. text-start / text-delta / text-end
```sse
data: {
  "id": "evt_9",
  "type": "text-start",
  "textId": "text_1"
}

data: {
  "id": "evt_10",
  "type": "text-delta",
  "textId": "text_1",
  "delta": "根据搜索结果，"
}

data: {
  "id": "evt_11",
  "type": "text-delta",
  "textId": "text_1",
  "delta": "我为你找到了 **12 个职位**：\n\n"
}

data: {
  "id": "evt_12",
  "type": "text-delta",
  "textId": "text_1",
  "delta": "1. Senior Software Engineer at Google\n"
}

data: {
  "id": "evt_13",
  "type": "text-end",
  "textId": "text_1",
  "content": "根据搜索结果，我为你找到了 **12 个职位**：\n\n1. Senior Software Engineer at Google\n..."
}
```

### 5. message-end
```sse
data: {
  "id": "evt_14",
  "type": "message-end",
  "messageId": "msg_abc123",
  "finishReason": "stop",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 280
  }
}
```

### 6. error
```sse
data: {
  "id": "evt_error",
  "type": "error",
  "code": "rate_limit",
  "message": "请求过于频繁，请 30 秒后重试",
  "retryAfter": 30
}
```

---

## 📝 完整对话示例

### 用户问："帮我分析这个职位是否适合我"

```
data: {"id":"1","type":"message-start","messageId":"msg_1","role":"assistant","timestamp":"2024-01-22T10:00:00Z"}

data: {"id":"2","type":"reasoning-start","reasoningId":"think_1"}

data: {"id":"3","type":"reasoning-delta","reasoningId":"think_1","delta":"用户想要分析职位匹配度。"}

data: {"id":"4","type":"reasoning-delta","reasoningId":"think_1","delta":"我需要：\n1. 获取职位详情\n2. 获取用户简历"}

data: {"id":"5","type":"reasoning-end","reasoningId":"think_1","content":"用户想要分析职位匹配度。我需要：\n1. 获取职位详情\n2. 获取用户简历"}

data: {"id":"6","type":"tool-call-start","toolCallId":"call_1","toolName":"job_get_detail","arguments":{"jobId":123}}

data: {"id":"7","type":"tool-call-start","toolCallId":"call_2","toolName":"resume_get_default","arguments":{}}

data: {"id":"8","type":"tool-call-delta","toolCallId":"call_1","status":"running"}

data: {"id":"9","type":"tool-call-delta","toolCallId":"call_2","status":"running"}

data: {"id":"10","type":"tool-call-result","toolCallId":"call_1","result":"获取到职位：Senior Software Engineer at Google","isError":false}

data: {"id":"11","type":"tool-call-result","toolCallId":"call_2","result":"获取到简历：张三的软件工程师简历","isError":false}

data: {"id":"12","type":"tool-call-start","toolCallId":"call_3","toolName":"job_analyze_match","arguments":{"jobId":123,"resumeId":5}}

data: {"id":"13","type":"tool-call-delta","toolCallId":"call_3","status":"running","progress":{"message":"正在分析技能匹配度..."}}

data: {"id":"14","type":"tool-call-result","toolCallId":"call_3","result":"匹配度分析完成","isError":false,"data":{"overallScore":85,"strengths":["5年+后端经验"],"gaps":["缺少GCP经验"]}}

data: {"id":"15","type":"text-start","textId":"text_1"}

data: {"id":"16","type":"text-delta","textId":"text_1","delta":"根据分析，"}

data: {"id":"17","type":"text-delta","textId":"text_1","delta":"这个职位与你的背景"}

data: {"id":"18","type":"text-delta","textId":"text_1","delta":"匹配度为 **85%**。\n\n"}

data: {"id":"19","type":"text-delta","textId":"text_1","delta":"**优势：**\n- 你有 5 年以上后端经验\n\n"}

data: {"id":"20","type":"text-delta","textId":"text_1","delta":"**差距：**\n- 需要补充 GCP 云平台经验"}

data: {"id":"21","type":"text-end","textId":"text_1","content":"根据分析，这个职位与你的背景匹配度为 **85%**。\n\n**优势：**\n- 你有 5 年以上后端经验\n\n**差距：**\n- 需要补充 GCP 云平台经验"}

data: {"id":"22","type":"message-end","messageId":"msg_1","finishReason":"stop","usage":{"inputTokens":200,"outputTokens":450}}
```

---

## ⚠️ 常见错误

### ❌ 错误1：缺少 id 字段
```sse
// ❌ 错误
{
  "type": "text-delta",
  "textId": "text_1",
  "delta": "Hello"
}

// ✅ 正确
{
  "id": "evt_123",  // 必需！
  "type": "text-delta",
  "textId": "text_1",
  "delta": "Hello"
}
```

### ❌ 错误2：缺少 end 事件
```
text-start → text-delta → (没有 text-end)  # ❌ 错误
```

### ❌ 错误3：错误的响应头
```http
x-vercel-ai-data-stream: v1  # ❌ 错误
x-vercel-ai-ui-message-stream: v1  # ✅ 正确
```

### ❌ 错误4：textId 不匹配
```sse
{"id":"1","type":"text-start","textId":"text_1"}
{"id":"2","type":"text-delta","textId":"text_2","delta":"..."}  // ❌ textId 不一致
```

---

## 🔧 测试工具

### 使用 curl 测试
```bash
curl -N -X POST http://localhost:3033/jobs/chat \
  -H "Content-Type: application/json" \
  -H "x-eve-token: your-token" \
  -d '{
    "messages": [{"role":"user","content":"帮我搜索职位","timestamp":"2024-01-22T10:00:00Z"}],
    "options": {"stream": true}
  }'
```

预期输出：
```
data: {"id":"1","type":"message-start",...}

data: {"id":"2","type":"text-start","textId":"text_1"}

data: {"id":"3","type":"text-delta","textId":"text_1","delta":"我"}

...
```

---

## 📊 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功，开始流式响应 |
| 400 | 请求格式错误 |
| 401 | Token 无效 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

---

## 💾 增量持久化

前端会在以下时机保存消息：
- 每次收到 `reasoning-delta`
- 每次收到 `text-delta`
- 每次收到 `tool-call-result`
- 每次收到 `message-end`

这确保了即使连接断开，已接收的内容也不会丢失。

---

## 🚀 实现建议

### Python (FastAPI) 示例
```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import uuid

app = FastAPI()

@app.post("/jobs/chat")
async def chat(request: ChatRequest):
    async def generate():
        # Message start
        yield f'data: {{"id":"{uuid.uuid4()}","type":"message-start","messageId":"msg_1","role":"assistant","timestamp":"{datetime.now().isoformat()}"}}\n\n'
        
        # Text start
        text_id = f"text_{uuid.uuid4()}"
        yield f'data: {{"id":"{uuid.uuid4()}","type":"text-start","textId":"{text_id}"}}\n\n'
        
        # Text deltas
        for chunk in "Hello world".split():
            yield f'data: {{"id":"{uuid.uuid4()}","type":"text-delta","textId":"{text_id}","delta":"{chunk} "}}\n\n'
        
        # Text end
        yield f'data: {{"id":"{uuid.uuid4()}","type":"text-end","textId":"{text_id}","content":"Hello world "}}\n\n'
        
        # Message end
        yield f'data: {{"id":"{uuid.uuid4()}","type":"message-end","messageId":"msg_1","finishReason":"stop"}}\n\n'
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "x-vercel-ai-ui-message-stream": "v1"  # 关键！
        }
    )
```

---

## ✅ 检查清单

- [ ] 所有事件都有唯一的 `id` 字段
- [ ] 遵循 start → delta → end 模式
- [ ] 响应头包含 `x-vercel-ai-ui-message-stream: v1`
- [ ] textId / reasoningId / toolCallId 在同一序列中保持一致
- [ ] 并行工具调用使用不同的 toolCallId
- [ ] 错误事件包含清晰的错误信息
- [ ] 测试过网络中断后的恢复
