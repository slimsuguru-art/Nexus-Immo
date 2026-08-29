import { supabase } from './supabase.js';

const listEl = document.querySelector('#conversationList');
const threadEl = document.querySelector('#threadMessages');
const threadHeader = document.querySelector('#threadHeader');
const threadPanel = document.querySelector('#threadPanel');
const messagerieEl = document.querySelector('#messagerie');
const composeForm = document.querySelector('#composeForm');
const composeInput = document.querySelector('#composeInput');

let me = null;
let allMessages = [];
let activeOther = null;
let activeProperty = null;
let activeKey = null;

function keyOf(m, myId) {
  const other = m.sender_id === myId ? m.recipient_id : m.sender_id;
  return `${m.property_id || 'general'}|${other}`;
}

function buildConversations() {
  const map = new Map();
  for (const m of allMessages) {
    const k = keyOf(m, me.id);
    const existing = map.get(k);
    if (!existing || new Date(m.created_at) > new Date(existing.last.created_at)) {
      const other = m.sender_id === me.id ? m.recipient : m.sender;
      map.set(k, {
        key: k,
        otherId: m.sender_id === me.id ? m.recipient_id : m.sender_id,
        otherName: other?.full_name || 'Utilisateur',
        propertyId: m.property_id,
        propertyTitle: m.properties?.title || null,
        last: m,
        unread: 0
      });
    }
  }
  for (const m of allMessages) {
    if (m.recipient_id === me.id && !m.read_at) {
      const c = map.get(keyOf(m, me.id));
      if (c) c.unread++;
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
}

function renderConversations() {
  const convs = buildConversations();
  listEl.innerHTML = convs.length
    ? convs.map(c => `
      <button class="conv-item${c.key === activeKey ? ' conv-item--active' : ''}" data-other="${c.otherId}" data-property="${c.propertyId || ''}" data-key="${c.key}">
        <div class="conv-item-top">
          <strong>${c.otherName}</strong>
          ${c.unread ? `<span class="conv-badge">${c.unread}</span>` : ''}
        </div>
        ${c.propertyTitle ? `<span class="conv-property">${c.propertyTitle}</span>` : ''}
        <p class="conv-preview">${c.last.content}</p>
      </button>
    `).join('')
    : '<p class="conv-empty">Aucune conversation pour l\'instant.</p>';

  listEl.querySelectorAll('.conv-item').forEach(btn => {
    btn.addEventListener('click', () => openConversation(btn.dataset.other, btn.dataset.property || null, btn.dataset.other + '|' + btn.dataset.key));
  });
}

async function renderThread() {
  const thread = allMessages
    .filter(m =>
      (m.sender_id === activeOther || m.recipient_id === activeOther) &&
      (m.property_id || null) === (activeProperty || null)
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  threadEl.innerHTML = thread.length
    ? thread.map(m => `
      <div class="msg-bubble ${m.sender_id === me.id ? 'msg-bubble--mine' : 'msg-bubble--theirs'}">
        <p>${m.content}</p>
        <span>${new Date(m.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `).join('')
    : '<p class="thread-hint">Écrivez le premier message pour démarrer la conversation.</p>';
  threadEl.scrollTop = threadEl.scrollHeight;

  const unreadIds = thread.filter(m => m.recipient_id === me.id && !m.read_at).map(m => m.id);
  if (unreadIds.length) {
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
  }
}

async function openConversation(otherId, propertyId, key) {
  activeOther = otherId;
  activeProperty = propertyId || null;
  activeKey = `${propertyId || 'general'}|${otherId}`;
  messagerieEl.classList.add('show-thread');
  threadPanel.classList.add('has-active');

  const known = allMessages.find(m => m.sender_id === otherId || m.recipient_id === otherId);
  if (known) {
    const other = known.sender_id === me.id ? known.recipient : known.sender;
    threadHeader.textContent = other?.full_name || 'Conversation';
  } else {
    const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', otherId).single();
    threadHeader.textContent = prof?.full_name || 'Nouvelle conversation';
  }

  renderConversations();
  renderThread();
}

async function loadMessages() {
  const { data } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(full_name), recipient:profiles!messages_recipient_id_fkey(full_name), properties(title)')
    .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
    .order('created_at', { ascending: true });
  allMessages = data || [];
  renderConversations();
  if (activeOther) renderThread();
}

composeForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const content = composeInput.value.trim();
  if (!content || !activeOther) return;
  composeInput.value = '';
  const { error } = await supabase.from('messages').insert({
    sender_id: me.id,
    recipient_id: activeOther,
    property_id: activeProperty,
    content
  });
  if (!error) await loadMessages();
});

document.querySelector('#threadBack')?.addEventListener('click', () => {
  messagerieEl.classList.remove('show-thread');
});

document.querySelector('#logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.href = 'index.html';
});

(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    location.replace('login.html?redirect=' + encodeURIComponent(location.pathname + location.search));
    return;
  }
  me = user;
  document.body.classList.add(user.user_metadata?.role === 'bailleur' ? 'bailleur-page' : 'locataire-page');

  await loadMessages();

  const params = new URLSearchParams(location.search);
  const withId = params.get('with');
  if (withId) await openConversation(withId, params.get('property'), null);

  supabase
    .channel('messages-inbox')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me.id}` }, loadMessages)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${me.id}` }, loadMessages)
    .subscribe();
})();
