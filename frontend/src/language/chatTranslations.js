// Translations for the floating AI chat widget's own UI shell — the
// title, placeholder, buttons, welcome message, etc.
//
// NOTE — important scope boundary: this only covers what the chat WIDGET
// itself displays around the conversation. The bot's actual REPLIES
// (result.reply / result.followups from askChatbot()) still come back in
// English from the backend, since the backend hasn't been extended to
// generate answers per-language yet. That's a separate, larger follow-up
// (see backend/chatbot/matcher.js) — this file only translates the
// chrome around that conversation, not the conversation content itself.

export const chatText = {
  en: {
    title: 'GDRFA AI Assistant',
    subtitle: 'Residency & entry permit support',
    closeAriaLabel: 'Close chat',
    openAriaLabel: 'Open GDRFA AI Assistant',
    closeToggleAriaLabel: 'Close GDRFA AI Assistant',
    toggleLabel: 'Need help? Ask the GDRFA AI Assistant',
    placeholder: 'Ask about services, fees, documents...',
    sendAriaLabel: 'Send message',
    welcomeText:
      "Hello, I'm the GDRFA AI Assistant. Ask me about document requirements, fees, service availability, or your application status.",
    welcomeFollowups: [
      'What documents do I need for residence renewal?',
      'What are your center hours?',
      'Check my application status',
    ],
    errorText: "I'm having trouble connecting right now. Make sure the backend is running, or contact GDRFA support directly.",
  },
  ar: {
    title: 'مساعد الإدارة الذكي',
    subtitle: 'دعم الإقامة وتصاريح الدخول',
    closeAriaLabel: 'إغلاق المحادثة',
    openAriaLabel: 'فتح مساعد الإدارة الذكي',
    closeToggleAriaLabel: 'إغلاق مساعد الإدارة الذكي',
    toggleLabel: 'هل تحتاج مساعدة؟ اسأل مساعد الإدارة الذكي',
    placeholder: 'اسأل عن الخدمات أو الرسوم أو المستندات...',
    sendAriaLabel: 'إرسال الرسالة',
    welcomeText:
      'مرحباً، أنا مساعد الإدارة الذكي. اسألني عن متطلبات المستندات أو الرسوم أو توفر الخدمة أو حالة طلبك.',
    welcomeFollowups: [
      'ما هي المستندات المطلوبة لتجديد الإقامة؟',
      'ما هي ساعات عمل المراكز؟',
      'تحقق من حالة طلبي',
    ],
    errorText: 'أواجه مشكلة في الاتصال الآن. تأكد من تشغيل الخادم، أو تواصل مع دعم الإدارة مباشرة.',
  },
  hi: {
    title: 'जीडीआरएफए एआई सहायक',
    subtitle: 'निवास और प्रवेश परमिट सहायता',
    closeAriaLabel: 'चैट बंद करें',
    openAriaLabel: 'जीडीआरएफए एआई सहायक खोलें',
    closeToggleAriaLabel: 'जीडीआरएफए एआई सहायक बंद करें',
    toggleLabel: 'मदद चाहिए? जीडीआरएफए एआई सहायक से पूछें',
    placeholder: 'सेवाओं, शुल्क, दस्तावेज़ों के बारे में पूछें...',
    sendAriaLabel: 'संदेश भेजें',
    welcomeText:
      'नमस्ते, मैं जीडीआरएफए एआई सहायक हूं। मुझसे दस्तावेज़ आवश्यकताओं, शुल्क, सेवा उपलब्धता, या आपके आवेदन की स्थिति के बारे में पूछें।',
    welcomeFollowups: [
      'निवास नवीनीकरण के लिए मुझे किन दस्तावेज़ों की आवश्यकता है?',
      'आपके केंद्र के समय क्या हैं?',
      'मेरे आवेदन की स्थिति जांचें',
    ],
    errorText: 'अभी कनेक्ट करने में समस्या हो रही है। सुनिश्चित करें कि बैकएंड चल रहा है, या सीधे जीडीआरएफए सहायता से संपर्क करें।',
  },
  tl: {
    title: 'GDRFA AI Assistant',
    subtitle: 'Suporta sa residency at entry permit',
    closeAriaLabel: 'Isara ang chat',
    openAriaLabel: 'Buksan ang GDRFA AI Assistant',
    closeToggleAriaLabel: 'Isara ang GDRFA AI Assistant',
    toggleLabel: 'Kailangan ng tulong? Tanungin ang GDRFA AI Assistant',
    placeholder: 'Magtanong tungkol sa serbisyo, bayad, dokumento...',
    sendAriaLabel: 'Ipadala ang mensahe',
    welcomeText:
      'Kumusta, ako ang GDRFA AI Assistant. Magtanong sa akin tungkol sa mga kailangang dokumento, bayad, availability ng serbisyo, o status ng iyong aplikasyon.',
    welcomeFollowups: [
      'Anong mga dokumento ang kailangan ko para sa residence renewal?',
      'Ano ang oras ng operasyon ng inyong mga sentro?',
      'Suriin ang status ng aking aplikasyon',
    ],
    errorText: 'May problema sa koneksyon ngayon. Siguraduhing tumatakbo ang backend, o direktang makipag-ugnayan sa GDRFA support.',
  },
  ur: {
    title: 'جی ڈی آر ایف اے اے آئی اسسٹنٹ',
    subtitle: 'رہائش اور انٹری پرمٹ سپورٹ',
    closeAriaLabel: 'چیٹ بند کریں',
    openAriaLabel: 'جی ڈی آر ایف اے اے آئی اسسٹنٹ کھولیں',
    closeToggleAriaLabel: 'جی ڈی آر ایف اے اے آئی اسسٹنٹ بند کریں',
    toggleLabel: 'مدد چاہیے؟ جی ڈی آر ایف اے اے آئی اسسٹنٹ سے پوچھیں',
    placeholder: 'خدمات، فیس، دستاویزات کے بارے میں پوچھیں...',
    sendAriaLabel: 'پیغام بھیجیں',
    welcomeText:
      'السلام علیکم، میں جی ڈی آر ایف اے اے آئی اسسٹنٹ ہوں۔ مجھ سے دستاویزات کی ضروریات، فیس، سروس کی دستیابی، یا اپنی درخواست کی حیثیت کے بارے میں پوچھیں۔',
    welcomeFollowups: [
      'رہائش کی تجدید کے لیے مجھے کن دستاویزات کی ضرورت ہے؟',
      'آپ کے مراکز کے اوقات کار کیا ہیں؟',
      'میری درخواست کی حیثیت چیک کریں',
    ],
    errorText: 'ابھی رابطہ قائم کرنے میں مسئلہ ہو رہا ہے۔ یقینی بنائیں کہ بیک اینڈ چل رہا ہے، یا براہ راست جی ڈی آر ایف اے سپورٹ سے رابطہ کریں۔',
  },
  bn: {
    title: 'জিডিআরএফএ এআই সহকারী',
    subtitle: 'রেসিডেন্সি ও এন্ট্রি পারমিট সহায়তা',
    closeAriaLabel: 'চ্যাট বন্ধ করুন',
    openAriaLabel: 'জিডিআরএফএ এআই সহকারী খুলুন',
    closeToggleAriaLabel: 'জিডিআরএফএ এআই সহকারী বন্ধ করুন',
    toggleLabel: 'সাহায্য দরকার? জিডিআরএফএ এআই সহকারীকে জিজ্ঞাসা করুন',
    placeholder: 'সেবা, ফি, নথি সম্পর্কে জিজ্ঞাসা করুন...',
    sendAriaLabel: 'বার্তা পাঠান',
    welcomeText:
      'হ্যালো, আমি জিডিআরএফএ এআই সহকারী। নথির প্রয়োজনীয়তা, ফি, সেবার প্রাপ্যতা, বা আপনার আবেদনের অবস্থা সম্পর্কে আমাকে জিজ্ঞাসা করুন।',
    welcomeFollowups: [
      'রেসিডেন্স নবায়নের জন্য আমার কোন নথি প্রয়োজন?',
      'আপনার কেন্দ্রের সময়সূচী কী?',
      'আমার আবেদনের অবস্থা পরীক্ষা করুন',
    ],
    errorText: 'এখন সংযোগ করতে সমস্যা হচ্ছে। ব্যাকএন্ড চলছে কিনা নিশ্চিত করুন, অথবা সরাসরি জিডিআরএফএ সহায়তার সাথে যোগাযোগ করুন।',
  },
}
