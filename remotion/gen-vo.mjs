import { writeFileSync } from 'fs';
const lines = {
 "01":"Welcome to Pi Bank — everyday banking, powered by the Pi ecosystem. This short guide shows you how to use every part of the app.",
 "02":"First, connect. Open Pi Bank inside the Pi Browser and tap Connect Pi Wallet. Grant the username, payments, and wallet address permissions to link your Pi identity to your account.",
 "03":"The home screen shows your balances in Pi and in your local currency. Tap the eye icon to hide them, and use the country switcher so the app follows your own central bank's rules.",
 "04":"To send money, open Transfer. Choose an account, enter the amount and the recipient. Pi Bank quotes the amount in Pi, and settlement happens through your Pi wallet.",
 "05":"The Bills section pays utilities and mobile top-ups. Pick a biller, enter your account number, confirm the amount in Pi, and the payment is on its way.",
 "06":"For cross-border payments, open Global. Enter an I-BAN and B-I-C. Pi Bank checks them live, screens the payment, and builds standard SWIFT and ISO twenty-oh-two-two instructions.",
 "07":"Need help? The Assist tab gives you three robots. Pi Assist answers general questions, OpenMind explains compliance, and RoboPay handles payment tasks. They always ask before doing anything.",
 "08":"In More and Settings you can change theme, language, desktop view, and manage your Pi wallet connection. That is Pi Bank — banking that speaks Pi. Everything here is a simulation, so explore freely."
};
for (const [id, text] of Object.entries(lines)) {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {method:'POST',headers:{Authorization:`Bearer ${process.env.LOVABLE_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini-tts',input:text,voice:'alloy',instructions:'Warm, clear, friendly product-tutorial narrator. Calm pace.'})});
  if(!r.ok){console.error(id, r.status, await r.text()); process.exit(1);}
  writeFileSync(`public/voiceover/${id}.mp3`, Buffer.from(await r.arrayBuffer()));
  console.log('ok', id);
}
