import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/ai', async (req,res)=>{
  const { prompt } = req.body;
  if(!prompt) return res.status(400).json({ error:'Missing prompt' });

  try{
    const response = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model:'gpt-4o-mini',
        messages:[
          { role:'system', content:'Bạn là AI Fantasy Codex, sáng tạo tự do nhân vật, phe phái, đế chế.'},
          { role:'user', content: prompt }
        ],
        temperature:0.9,
        max_tokens:400
      })
    });
    const data = await response.json();
    res.json({ aiText: data.choices[0].message.content });
  } catch(err){
    console.error(err);
    res.status(500).json({ error:'AI error' });
  }
});

app.listen(3000, ()=>console.log('Server chạy http://localhost:3000'));