const { commands, CATEGORIES } = require('../registry/commands');
const { prefix, menuCommandCount } = require('../config');
const { formatWibTime, formatWibDate, formatUptime, formatRam } = require('../utils/format');

function renderAllMenu({ pushName, senderTag, groupName, members, adminCount, userProfile, sewaCount = 46 }) {
  const byCategory = Object.values(CATEGORIES).map((cat) => {
    const names = commands.filter((c) => c.category === cat).map((c) => c.name);
    return `✧ *${cat}*\n${names.map((n) => `  - ${prefix} ${n}`).join('\n')}`;
  }).join('\n\n');

  return `╭・❀・・・・・・・・・・・❀・╮
  Halo @${senderTag}! ૮ ˶ᵔ ᵕ ᵔ˶ ა
  ✧･ﾟ: ✧ Welcome to Ditstore Bot ✧:･ﾟ✧

  ⋆｡°✩ Bot Status ✩°｡⋆
  ✧ Prefix: ${prefix}
  ✧ Time: ${formatWibTime()}
  ✧ Date: ${formatWibDate()}
  ✧ Commands: ${menuCommandCount}
  ✧ Sewa: ${sewaCount} grup
  ✧ Uptime: ${formatUptime()}
  ✧ RAM: ${formatRam()}

  ⋆｡°✩ Group Details ✩°｡⋆
  ✧ Name: ${groupName || '-'}
  ✧ Members: ${members || 0}
  ✧ Admin: ${adminCount || 0}
  ✧ Mode: All Members

  ⋆｡°✩ User Profile ✩°｡⋆
  ✧ Status: ${userProfile?.premium ? '✧Premium✧' : 'Free'}
  ✧ Limit: ${userProfile?.limit ?? 10}
  ✧ Level: ${userProfile?.level ?? 1}
  ✧ Exp: ${userProfile?.exp ?? 0}
┈ ⋆ ┈ ⋆ ┈ ⋆ ┈ ⋆ ┈ ⋆ ┈ ⋆ ┈
${byCategory}`;
}

module.exports = { renderAllMenu };
