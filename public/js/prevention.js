
//SQL injection
function sanitizeForSQL(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
   
    return input
        .replace(/'/g, "''")           
        .replace(/"/g, '""')           
        .replace(/;/g, '')            
        .replace(/--/g, '')          
        .replace(/\/\*/g, '')         
        .replace(/\*\//g, '')         
        .replace(/\bOR\b/gi, '')      
        .replace(/\bAND\b/gi, '')      
        .replace(/\bUNION\b/gi, '')    
        .replace(/\bSELECT\b/gi, '')   
        .replace(/\bINSERT\b/gi, '')   
        .replace(/\bUPDATE\b/gi, '')  
        .replace(/\bDELETE\b/gi, '')   
        .replace(/\bDROP\b/gi, '')     
        .replace(/\bEXEC\b/gi, '')     
        .replace(/\bALTER\b/gi, '');   
}

function validateSQLSafety(input) {
    if (typeof input !== 'string') {
        return true;
    }
    
    const dangerousPatterns = [
        /'.*OR.*'/i,
        /'.*AND.*'/i,
        /UNION.*SELECT/i,
        /DROP.*TABLE/i,
        /DELETE.*FROM/i,
        /INSERT.*INTO/i,
        /UPDATE.*SET/i,
        /--/,
        /\/\*.*\*\//,
        /;\s*$/
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(input));
}

 //XSS Prevention
 
function encodeHTML(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    
    return input.replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}


function sanitizeHTML(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
  
    input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    
    const dangerousTags = [
        'script', 'iframe', 'object', 'embed', 'form', 'input', 
        'textarea', 'button', 'select', 'option', 'meta', 'link'
    ];
    
    dangerousTags.forEach(tag => {
        const regex = new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>`, 'gi');
        input = input.replace(regex, '');
        
       
        const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*/>`, 'gi');
        input = input.replace(selfClosingRegex, '');
    });
    
    
    const dangerousAttrs = [
        'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
        'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeyup',
        'onkeydown', 'onkeypress', 'javascript:', 'vbscript:'
    ];
    
    dangerousAttrs.forEach(attr => {
        const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        input = input.replace(regex, '');
    });
    
    return input;
}


function validateXSSSafety(input) {
    if (typeof input !== 'string') {
        return true;
    }
    
    const xssPatterns = [
        /<script/i,
        /<iframe/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
        /onclick=/i,
        /onmouseover=/i,
        /<img[^>]+src[^>]*>/i,
        /<svg[^>]*>/i,
        /eval\(/i,
        /alert\(/i,
        /document\.cookie/i,
        /document\.write/i
    ];
    
    return !xssPatterns.some(pattern => pattern.test(input));
}


function secureInput(input, type = 'general') {
    // Handle null, undefined, or empty string
    if (!input || typeof input !== 'string' || input.trim() === '') {
        return '';
    }
    
    const trimmedInput = input.trim();
    
   
    if (!validateSQLSafety(trimmedInput)) {
        throw new Error('Potentially dangerous SQL pattern detected');
    }
    
   
    if (!validateXSSSafety(trimmedInput)) {
        throw new Error('Potentially dangerous XSS pattern detected');
    }
    
 
    let sanitized = trimmedInput;
    
    switch (type) {
      
            
        case 'pinName':
        
            sanitized = sanitizeForSQL(sanitized);
            sanitized = encodeHTML(sanitized);
           
            sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-\.,!]/g, '');
            break;
            
        case 'description':
        
            sanitized = sanitizeForSQL(sanitized);
            sanitized = sanitizeHTML(sanitized);
            sanitized = encodeHTML(sanitized);
            break;
            
        default:
          
            sanitized = sanitizeForSQL(sanitized);
            sanitized = encodeHTML(sanitized);
            break;
    }
    
   
    sanitized = sanitized.trim();
    
    
    if (sanitized !== trimmedInput) {
        console.warn('Input was sanitized for security:', { original: trimmedInput, sanitized: sanitized });
    }
    
    return sanitized;
}

//Safe DOM Manipulation

function safeSetText(element, text) {
    if (!element) return;
    
   
    element.textContent = encodeHTML(String(text));
}

function safeSetHTML(element, html) {
    if (!element) return;
    
    
    const sanitizedHTML = sanitizeHTML(encodeHTML(String(html)));
    element.innerHTML = sanitizedHTML;
}

function safeSetAttribute(element, attribute, value) {
    if (!element) return;
    
   
    const sanitizedValue = encodeHTML(String(value));
    element.setAttribute(attribute, sanitizedValue);
}

function validateEmail(input) {
    if (typeof input !== 'string') {
        return true;
    }
    
   
    return validateSQLSafety(input) && validateXSSSafety(input);
}

function validatePassword(input) {
    if (typeof input !== 'string') {
        return true;
    }
    
 
    return validateSQLSafety(input) && validateXSSSafety(input);
}

function sanitizeEmailInput(input) {
    if (typeof input !== 'string' || input.trim() === '') {
        return '';
    }
    
   
    return input.replace(/[<>"']/g, '');
}

function sanitizePasswordInput(input) {
    if (typeof input !== 'string' || input.trim() === '') {
        return '';
    }
    
   
    return input.replace(/[<>"']/g, '');
}
