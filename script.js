 
const chatsContainer=document.querySelector(".chats-container");
const container=document.querySelector(".container");
const promptForm=document.querySelector(".prompt-form");
const promptInput=promptForm.querySelector(".prompt-input");
const fileInput=promptForm.querySelector("#file-input");
const fileUploadWrapper=promptForm.querySelector(".file-upload-wrapper");
const themeToggle =document.querySelector("#theme-toggle-btn");






// API SETUP 

const API_KEY="AIzaSyBIWj1c3pi4dnsdeLDd3_Z0GFJT8xUHlgs";

const API_URL= `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;


let typingInterval,controller;
const chatHistory =[];
const userData= {message: "", file: {}}

// Fuction to create message element 
const createMsgElement = (content,...classes) =>{
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML=content;
    return div;
}
//   Automatic Scroll bar Container
const scrollToBottom = () =>container.scrollTo({top: container.scrollHeight, behavior: "smooth"})


//  Stimulate typing effect

const typingEffect= (text,textElement,botMsgDiv) =>{
    textElement.textContent = ""

    const words = text.split(" ");
    let wordIndex = 0;

function renderMarkdown(text){
    text =  text.replace(/```([\s\S]*?)```/g,(_, code)=>
         `
        <div class= "code-block"> 
           <button class="copy-btn">Copy</button>
          <pre><code>${escapeHTML(code)}</code></pre>
        </div>`

        )
       
        // Inline mode
        .replace(/`([^`]+)`/g,"<code>$1</code>")

        // Bold
        .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")

        //  Italic
        .replace(/\*(.*?)\*/g,"<em>$1</em>")

        //  Numbered list
        .replace(
            /(?:^|\n)(\d+\. .+(?:\n\d+\. .+)*)/g,
            match=>"<ol>" + match
            .trim()
            .split("\n")
            .map(line=>`<li>${line.replace(/^\d+\. /,"")}</li>`)
            .join("")+
            "</ol>"
        )
 
        // Bullet list 
           .replace(/(?:^|\n)(- .+(?:\n- .+)*)/g,
            match  => "<ul>"+
            match
            .trim()
            .split("\n")
            .map(line=>`<li>${line.slice(2)}</li>`)
            .join("") + "</ul>"
         )
        
        //  Line breaks
        return text.replace(/\n/g, "<br>")
         
}

function addCopyButtons(container){
    container.querySelector(".copy-btn").forEach(btn => {
        btn.addEventListener("click",()=>{
            const code = btn.nextElementSibling.innerText;
            navigator.clipboard.writeText(code);
            btn.textContent = "Copied!";
            setTimeout(()=>(btn.textContent = "Copy"),1500)
        })
        
    });
}
function escapeHTML(str){
    return str 
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")   
}
// typing intervel to type each word

    typingInterval = setInterval(()=>{
   if(wordIndex <words.length){
    textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
    
    
    scrollToBottom();
}

else{
    clearInterval(typingInterval);
    textElement.innerHTML = renderMarkdown(text)

    addCopyButtons(textElement)
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding")

   }
    },40)
}
// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) =>{

    const textElement =  botMsgDiv.querySelector(".message-text")
    controller= new AbortController();

  
    // Add User Message Chats History

    chatHistory.push({
        role:"user",
        parts:[{text: userData.message},  ...(userData.file.data ? [{inline_data:(({fileName, isImage, ...rest }) => rest)(userData.file)}] :[])]
    });
    try{

        // Send the chat history to the API to get a response
        const response = await fetch(API_URL ,{
            method: "POST",
            headers:{"Content-type":"application/json"},
            body:JSON.stringify({contents:chatHistory}),
            signal: controller.signal
        });


        const data  = await response.json();
        if(!response.ok) throw new Error(data.error.message);

    //    Process the response text and display with typing effect
        const responseText = data.candidates[0].content.parts[0].text.trim();
        typingEffect(responseText,textElement,botMsgDiv);
        chatHistory.push({role:"model",parts:[{text:responseText}]});

 

    } catch(error){
        textElement.style.color =   "#d62939"
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped.": error.message;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding")
    

     } finally{
        userData.file={};
    }

}

// Handle the form submission

const handleFormSubmit = (e) =>{
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if(!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value="";
    userData.message = userMessage;
    document.body.classList.add("bot-responding","chats-active")
    fileUploadWrapper.classList.remove("active",  "img-attached","file-attached");

   
    // Generate user message HTML and add in chats container 
    const userMsgHTML = `<div class = "message-text"></div>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>` : `<p class="file-attachment"><span class="file-icon material-symbols-outlined">description</span>${userData.file.fileName}</p>`):""}`;
    const userMsgDiv = createMsgElement(userMsgHTML,"user-message" );
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() =>{
        // Generate bot message HTML and add in the chats container after 600ms 
           const botMsgHTML = `<img src="gemini-chatbot-logo.svg" class="avatar"> <div class = "message-text"> Just a sec...</div>`;
    const botMsgDiv = createMsgElement(botMsgHTML,"bot-message","loading" );
     chatsContainer.appendChild(botMsgDiv);
     scrollToBottom();
     generateResponse(botMsgDiv);

    }, 600);
    
}
// Handle file Input change (file upload)
fileInput.addEventListener("change",()=>{
    const file = fileInput.files[0];
    if(!file)return;

    const isImage = file.type.startsWith("image/")
    const reader = new FileReader()
    reader.readAsDataURL(file);

    reader.onload = (e) =>{
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1]
        fileUploadWrapper.querySelector(".file-preview").src=e.target.result;

        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        //  store file data in userdata obj

        userData.file= {fileName: file.name, data: base64String, mime_type:file.type, isImage }
    }
})

// cancel file button
document.querySelector("#cancel-file-btn").addEventListener("click",()=>{
    userData.file = {};

    fileUploadWrapper.classList.remove("active",  "img-attached","file-attached");

})
// cancel ongoing bot response   
document.querySelector("#stop-response-btn").addEventListener("click",()=>{
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    //  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
     const loadingMsg = chatsContainer.querySelector(".bot-message.loading");
     if(loadingMsg) loadingMsg.classList.remove("loading");

    document.body.classList.remove("bot-responding")

 
})


// / delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click",()=>{
    chatHistory.length=0;
    chatsContainer.innerHTML="";
    document.body.classList.remove("bot-responding","chats-active");

});
// Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach(item=>{
    item.addEventListener("click", ()=>{
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    })
})

// Show/hide controls for mobiile on prompt input focus
document.addEventListener("click",({target})=>{
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id==="stop-response-btn"));
    wrapper.classList.toggle("hide-controls",shouldHide);
})

//  dark/lighgt theme toggle 
themeToggle.addEventListener("click",()=>{
   const isLightTheme= document.body.classList.toggle("light-theme")
   localStorage.setItem("themeColor",isLightTheme ? "light_mode" : "dark_mode")
   themeToggle.textContent=isLightTheme ? "dark_mode" : "light_mode"

})


//  set initial theme in local storage
 const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
 document.body.classList.toggle("light-theme", isLightTheme);
 themeToggle.textContent= isLightTheme ? "dark_mode" : "light_mode"


promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click",() => fileInput.click());
