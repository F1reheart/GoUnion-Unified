const fs = require('fs');
const content = fs.readFileSync('frontend/components/feed/PostCard.jsx', 'utf8');

const start = content.indexOf('cleanCaption && (_jsx');
const end = content.indexOf('_jsxs("div", { className: "p-4 border-t border-white/5"');

if (start === -1 || end === -1) {
    console.error("Could not find start or end bounds.");
    process.exit(1);
}

const before = content.substring(0, start);
const target = content.substring(start, end);
const after = content.substring(end);

// Remove the trailing comma and space from target so it can be inside the array correctly
let cleanTarget = target.trim();
if (cleanTarget.endsWith(',')) {
    cleanTarget = cleanTarget.slice(0, -1);
}

const inject = `post.is_taken_down ? _jsxs("div", { className: "p-6 text-center border border-white/5 rounded-2xl bg-black/40 backdrop-blur-md flex flex-col items-center gap-3 my-4 mx-4", children: [ _jsx(ShieldCheck, { className: "w-8 h-8 text-zinc-500" }), _jsx("p", { className: "text-sm text-zinc-400 font-bold", children: "This post was taken down by GoUnion." }), _jsx("p", { className: "text-xs text-zinc-500 italic", children: \`Reason: \${post.take_down_reason || 'Community Guidelines Violation'}\` }) ] }) : _jsxs(_Fragment, { children: [ ${cleanTarget} ] }), `;

fs.writeFileSync('frontend/components/feed/PostCard.jsx', before + inject + after);
console.log("Successfully injected is_taken_down check!");
