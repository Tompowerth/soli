// ============================================================
// SOLI — System Prompt Module
// lib/system-prompt.js
// Exports the full system prompt as a string for the chat engine
// ============================================================

import fs from 'fs';
import path from 'path';

// Load the markdown system prompt
const promptPath = path.join(process.cwd(), 'lib', 'system-prompt.md');

export const SOLI_SYSTEM_PROMPT = fs.readFileSync(promptPath, 'utf-8');

// Zodiac data for quick reference
export const ZODIAC_DATA = {
  aries:       { element: 'fire',  modality: 'cardinal', dates: 'Mar 21 – Apr 19', symbol: '♈', traits: ['brave','confident','enthusiastic','direct','impatient'] },
  taurus:      { element: 'earth', modality: 'fixed',    dates: 'Apr 20 – May 20', symbol: '♉', traits: ['reliable','patient','devoted','stubborn','possessive'] },
  gemini:      { element: 'air',   modality: 'mutable',  dates: 'May 21 – Jun 20', symbol: '♊', traits: ['adaptable','curious','witty','restless','inconsistent'] },
  cancer:      { element: 'water', modality: 'cardinal', dates: 'Jun 21 – Jul 22', symbol: '♋', traits: ['nurturing','protective','intuitive','moody','clingy'] },
  leo:         { element: 'fire',  modality: 'fixed',    dates: 'Jul 23 – Aug 22', symbol: '♌', traits: ['creative','generous','warm','dramatic','proud'] },
  virgo:       { element: 'earth', modality: 'mutable',  dates: 'Aug 23 – Sep 22', symbol: '♍', traits: ['analytical','practical','helpful','critical','anxious'] },
  libra:       { element: 'air',   modality: 'cardinal', dates: 'Sep 23 – Oct 22', symbol: '♎', traits: ['diplomatic','fair','social','indecisive','people-pleasing'] },
  scorpio:     { element: 'water', modality: 'fixed',    dates: 'Oct 23 – Nov 21', symbol: '♏', traits: ['passionate','resourceful','brave','secretive','jealous'] },
  sagittarius: { element: 'fire',  modality: 'mutable',  dates: 'Nov 22 – Dec 21', symbol: '♐', traits: ['optimistic','adventurous','honest','blunt','restless'] },
  capricorn:   { element: 'earth', modality: 'cardinal', dates: 'Dec 22 – Jan 19', symbol: '♑', traits: ['disciplined','responsible','ambitious','rigid','pessimistic'] },
  aquarius:    { element: 'air',   modality: 'fixed',    dates: 'Jan 20 – Feb 18', symbol: '♒', traits: ['independent','innovative','humanitarian','detached','stubborn'] },
  pisces:      { element: 'water', modality: 'mutable',  dates: 'Feb 19 – Mar 20', symbol: '♓', traits: ['compassionate','intuitive','creative','escapist','oversensitive'] },
};

// Tarot Major Arcana
export const TAROT_MAJOR_ARCANA = [
  { number: 0,  name: 'The Fool',        upright: 'New beginnings, innocence, spontaneity, free spirit', reversed: 'Recklessness, taken advantage of, inconsideration' },
  { number: 1,  name: 'The Magician',    upright: 'Manifestation, resourcefulness, power, inspired action', reversed: 'Manipulation, poor planning, untapped talents' },
  { number: 2,  name: 'The High Priestess', upright: 'Intuition, sacred knowledge, divine feminine, subconscious', reversed: 'Secrets, disconnected from intuition, withdrawal' },
  { number: 3,  name: 'The Empress',     upright: 'Femininity, beauty, nature, nurturing, abundance', reversed: 'Creative block, dependence, emptiness' },
  { number: 4,  name: 'The Emperor',     upright: 'Authority, structure, control, fatherhood', reversed: 'Tyranny, rigidity, coldness' },
  { number: 5,  name: 'The Hierophant',  upright: 'Spiritual wisdom, tradition, conformity, education', reversed: 'Personal beliefs, freedom, challenging status quo' },
  { number: 6,  name: 'The Lovers',      upright: 'Love, harmony, relationships, values alignment, choices', reversed: 'Self-love, disharmony, imbalance, misalignment' },
  { number: 7,  name: 'The Chariot',     upright: 'Control, willpower, success, action, determination', reversed: 'Self-discipline, opposition, lack of direction' },
  { number: 8,  name: 'Strength',        upright: 'Courage, bravery, inner strength, compassion', reversed: 'Self-doubt, weakness, insecurity' },
  { number: 9,  name: 'The Hermit',      upright: 'Soul searching, introspection, being alone, inner guidance', reversed: 'Isolation, loneliness, withdrawal' },
  { number: 10, name: 'Wheel of Fortune',upright: 'Good luck, karma, life cycles, destiny, turning point', reversed: 'Bad luck, resistance to change, breaking cycles' },
  { number: 11, name: 'Justice',         upright: 'Justice, fairness, truth, cause and effect, law', reversed: 'Unfairness, lack of accountability, dishonesty' },
  { number: 12, name: 'The Hanged Man',  upright: 'Pause, surrender, letting go, new perspectives', reversed: 'Delays, resistance, stalling, indecision' },
  { number: 13, name: 'Death',           upright: 'Endings, change, transformation, transition', reversed: 'Resistance to change, personal transformation, inner purging' },
  { number: 14, name: 'Temperance',      upright: 'Balance, moderation, patience, purpose', reversed: 'Imbalance, excess, self-healing, realignment' },
  { number: 15, name: 'The Devil',       upright: 'Shadow self, attachment, addiction, restriction', reversed: 'Releasing limiting beliefs, exploring dark thoughts, detachment' },
  { number: 16, name: 'The Tower',       upright: 'Sudden change, upheaval, chaos, revelation, awakening', reversed: 'Personal transformation, fear of change, averting disaster' },
  { number: 17, name: 'The Star',        upright: 'Hope, faith, purpose, renewal, spirituality', reversed: 'Lack of faith, despair, self-trust, disconnection' },
  { number: 18, name: 'The Moon',        upright: 'Illusion, fear, anxiety, subconscious, intuition', reversed: 'Release of fear, repressed emotion, inner confusion' },
  { number: 19, name: 'The Sun',         upright: 'Positivity, fun, warmth, success, vitality', reversed: 'Inner child, feeling down, overly optimistic' },
  { number: 20, name: 'Judgement',       upright: 'Judgement, rebirth, inner calling, absolution', reversed: 'Self-doubt, inner critic, ignoring the call' },
  { number: 21, name: 'The World',       upright: 'Completion, integration, accomplishment, travel', reversed: 'Seeking personal closure, short-cuts, delays' },
];

// HALT+ states for proactive detection
export const HALT_STATES = {
  hungry:    { triggers: ['irritable','cant think','low energy','headache','shaky'], response: 'physical_needs' },
  angry:     { triggers: ['furious','hate','cant stand','so angry','pissed'], response: 'emotional_vent' },
  lonely:    { triggers: ['nobody','alone','no one','by myself','isolated'], response: 'social_connection' },
  tired:     { triggers: ['exhausted','cant sleep','so tired','no energy','drained'], response: 'rest_first' },
  stressed:  { triggers: ['overwhelmed','too much','cant handle','drowning','swamped'], response: 'brain_dump' },
  anxious:   { triggers: ['worried','scared','what if','panic','nervous'], response: 'grounding' },
  sad:       { triggers: ['depressed','hopeless','crying','empty','numb'], response: 'presence' },
  bored:     { triggers: ['stuck','nothing matters','pointless','bored','unmotivated'], response: 'values_check' },
  guilty:    { triggers: ['my fault','should have','stupid','ashamed','regret'], response: 'compassion' },
};

// Crisis keywords that trigger Sonnet + safety protocol
export const CRISIS_KEYWORDS = [
  'suicide','kill myself','end it all','want to die','no reason to live',
  'self harm','cut myself','hurt myself','overdose','jump off',
  'abuse','hitting me','beats me','raped','molested',
  'voices','hearing things','seeing things','they are watching',
];

// Emergency hotlines by country
export const EMERGENCY_HOTLINES = {
  IL: { name: 'Israel',    lines: [{ name: 'ERAN', number: '1201' }, { name: 'Sahar', number: '*6350' }, { name: 'Mental Health', number: '*2516' }] },
  US: { name: 'USA',       lines: [{ name: '988 Suicide & Crisis', number: '988' }, { name: 'Crisis Text', number: 'Text HOME to 741741' }] },
  AR: { name: 'Argentina', lines: [{ name: 'Centro de Asistencia al Suicida', number: '135' }] },
  GB: { name: 'UK',        lines: [{ name: 'Samaritans', number: '116 123' }, { name: 'SHOUT', number: 'Text SHOUT to 85258' }] },
  CA: { name: 'Canada',    lines: [{ name: 'Talk Suicide Canada', number: '988' }] },
  AU: { name: 'Australia', lines: [{ name: 'Lifeline', number: '13 11 14' }] },
};
