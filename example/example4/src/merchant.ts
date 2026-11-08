import { renderMarkdown, typewrite } from 'lunarkit';
import type { Choice, CommandContext, Commands, CompletionCandidate, CompletionContext, TerminalOutput, TerminalView } from 'lunarkit';
import { eventById } from './content/events';
import { item, items } from './content/items';
import { distance, goods, planet, planets } from './content/planets';
import { available, buyItem, capacity, cargoCount, createRun, depart, price, quantity, requireAlive, requirePort, resolveEvent, score, service, shopItems, trade, travel, useItem } from './game/engine';
import { createStorage } from './game/storage';
import type { Run } from './game/types';
import { cargoDetails, creditHistory, dashboard, itemDetails, planetDetails } from './ui/render';

// 将消费端游戏会话与六个命令绑定，状态完全留在 example4。
export function createMerchant(storage?: Storage) {
  const saves = createStorage(storage);
  let active: Run | null = null;
  let slot = 0;
  let paused = false;
  let gameView: TerminalView | undefined;

  // 生成带当前港口或航行状态的消费端标签。
  function prompt(): string {
    return active ? `${paused ? 'paused' : 'merchant'} ${active.destination ?? active.location} ❯` : 'merchant ❯';
  }
  // 返回活动运行并根据暂停状态约束游戏动作。
  function run(allowPaused = false): Run {
    if (!active) throw new Error('Use play to start a voyage.');
    if (paused && !allowPaused) throw new Error('Voyage paused. Use pause to continue.');
    return active;
  }
  // 保持命令标签与游戏状态同步。
  function update(context: CommandContext): void { context.setPrompt(prompt()); }
  // 输出英文规则、可用操作和计分方式。
  function help(context: CommandContext): void {
    context.write(renderMarkdown(`## Commands\n**about** · introduction\n\n**play** · three save slots\n\n**pause** · save, exit, continue (also type pause + Enter during a choice or message)\n\n**fetch [history|cargo|planet|item]** · ship, charts, and details\n\n**do** · list actions for the current situation\n\n## Turn rules\nOnly **do travel** advances time: 12–23 distance, fuel, maintenance, market movement, and one event. Resolve that event before continuing. Trading and choices cost no turns.\n\n## Trade\n**do market**, **do buy grain 5**, **do sell grain 5**, **do refuel 10**, **do repair 10**, **do equip shield**, **do use patch**, **do discard patch**. Leave out an argument to select or type it inline.\n\n## Route\n**do depart [planet]**, **do travel**, **do resolve [option]**. Events always offer **endure**: lose 12 hull.\n\n## Survival & score\nHull zero or empty fuel during a crossing ends a voyage. Unpaid maintenance damages hull. Score = credits + 25 × turns + 100 × routes + cargo resale value. Equipment uses six slots; initial cargo capacity is 30.\n\n## World\nTen planets, ten local specialties, twenty items, thirty events. Prices move by up to 3% per travel turn within bounded markets. Your home specialty is cheaper to buy; posted selling bids include a 10% spread.`));
  }
  // 展示用户指定拼写的 banner 和游戏简介。
  function about(context: CommandContext): void {
    const element = document.createElement('section');
    const heading = document.createElement('h1');
    heading.className = 'merchant-banner';
    heading.textContent = 'LuanrMerchant';
    element.append(heading, renderMarkdown('A small turn-based merchant roguelike among ten restless worlds.\n\nTrade local specialties, choose the next star, and keep your ship alive. Credits become score; every extra crossing is another chance to lose everything.\n\n**Type play to begin.** Three local save slots remember your explicit saves on this browser.\n\nIcons by [Streamline](https://streamlinehq.com), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Selected Sharp Solid Free paths use LunarKit aliases.'));
    context.write(element);
  }
  // 将死亡结算写入去重历史，并立即结束当前运行。
  function finish(context: CommandContext): boolean {
    if (!active?.ended) return false;
    const value = score(active);
    saves.record({ id: active.id, turn: active.turn, score: value, routes: active.routes, date: new Date().toISOString() });
    const result = `VOYAGE ENDED — ${active.turn} turns · ${active.routes} routes · score ${value}. Use fetch for history or play for another voyage.`;
    active = null;
    paused = false;
    gameView?.close();
    gameView = undefined;
    update(context);
    context.write(result);
    return true;
  }
  // 读取三槽选择，已保存槽位提供继续或确认新局。
  async function play(context: CommandContext): Promise<void> {
    if (active) throw new Error('A voyage is already active. Use pause to save or exit.');
    const choices: Choice[] = [];
    for (let index = 0; index < 3; index += 1) {
      const saved = saves.load(index);
      choices.push({ value: String(index), label: `Slot ${index + 1}`, description: saved ? `Turn ${saved.turn} · ${saved.credits} credits · ${planet(saved.location).name}` : 'Empty — new voyage' });
    }
    const selected = Number(await context.choose({ prompt: 'Choose a save slot', choices }));
    const saved = saves.load(selected);
    let next = saved;
    if (saved) {
      const action = await context.choose({ prompt: `Slot ${selected + 1}`, choices: [{ value: 'resume', label: 'Resume voyage' }, { value: 'new', label: 'Start a new voyage' }] });
      if (action === 'new') {
        const confirmation = await context.choose({ prompt: 'Replace this slot on your next explicit save?', choices: [{ value: 'back', label: 'Keep the existing voyage' }, { value: 'replace', label: 'Start fresh' }] });
        if (confirmation === 'back') return;
        next = null;
      }
    }
    context.signal.throwIfAborted();
    gameView = context.openView();
    slot = selected;
    active = next ?? createRun();
    paused = false;
    update(context);
    if (saves.getWarning()) context.write(saves.getWarning());
    context.write(`Slot ${slot + 1} ready. ${planet(active.location).name} · ${active.credits} credits · ${active.fuel} fuel · ${active.hull} hull. Use do for actions. Save from pause to keep progress.`);
    if (active.pending) context.write('An event is waiting. Use do resolve.');
    else await showArrival(context);
  }
  // 优先暂停当前交互，保存后继续保留暂停菜单。
  async function pause(context: CommandContext): Promise<void> {
    run(true);
    paused = true;
    update(context);
    while (active && paused) {
      const action = await context.choose({ prompt: 'Voyage paused', choices: [{ value: 'save', label: 'Save' }, { value: 'continue', label: 'Continue' }, { value: 'exit', label: 'Exit' }] });
      if (action === 'save') {
        saves.save(slot, active);
        context.write(saves.getWarning() || `Saved to slot ${slot + 1}. Voyage remains paused.`);
      } else if (action === 'continue') {
        paused = false;
        update(context);
        context.write(active.pending ? 'Resumed. Use do resolve for the waiting event.' : 'Resumed. Use do for available actions.');
        if (!active.pending) await showArrival(context);
      } else {
        const confirmation = await context.choose({ prompt: 'Exit to the main terminal? Progress since your last save will be lost.', choices: [{ value: 'stay', label: 'Stay paused' }, { value: 'exit', label: 'Exit to main terminal' }] });
        if (confirmation === 'exit') {
          active = null;
          paused = false;
          gameView?.close();
          gameView = undefined;
          update(context);
          context.write('Returned to the main terminal. Your last explicit save is available in play.');
        }
      }
    }
  }
  // 根据查询目标输出游戏数据、英文道具文档或星球模型。
  async function fetch(context: CommandContext): Promise<void> {
    const query = context.args.join(' ').toLowerCase();
    if (query === 'history' || query === 'cargo') {
      const current = run(true);
      await animatedOutput(context, query === 'history' ? creditHistory(current) : cargoDetails(current));
      return;
    }
    if (query) {
      for (const world of planets) if (world.id === query || world.name.toLowerCase() === query) { await animatedOutput(context, planetDetails(world, active ?? undefined)); return; }
      await itemDetails(item(query), context);
      return;
    }
    if (active) { await animatedOutput(context, dashboard(active)); return; }
    const history = saves.history();
    let text = history.length ? '' : 'No completed voyages yet. Use play to launch your first ship.';
    for (const entry of history) text += `${entry.date.slice(0, 10)} · ${entry.turn} turns · ${entry.routes} routes · score ${entry.score}\n`;
    if (saves.getWarning()) text += `\n${saves.getWarning()}`;
    await animatedOutput(context, text);
  }
  // 统一为所有 fetch 分支逐字揭示文字并保留动态渲染组件。
  async function animatedOutput(context: CommandContext, output: TerminalOutput): Promise<void> {
    if (typeof output === 'string') {
      const element = document.createElement('div');
      element.textContent = output;
      context.write(element);
      await typewrite({ element, signal: context.signal, interval: 3 });
    } else {
      context.write(output);
      await typewrite({ element: 'element' in output ? output.element : output, signal: context.signal, interval: 3 });
    }
  }

  // 在抵达事件结算后展示目的地，取消时保留可恢复标记。
  async function showArrival(context: CommandContext): Promise<void> {
    if (!active?.arrivalPending || active.pending || active.ended) return;
    const current = active;
    await context.nextScene();
    await animatedOutput(context, planetDetails(planet(current.location), current));
    context.signal.throwIfAborted();
    current.arrivalPending = false;
  }

  // 罗列当前阶段实际可用的动作及明确的参数格式。
  function actions(context: CommandContext): void {
    const current = run();
    if (current.pending) {
      const event = eventById(current.pending);
      context.write(`EVENT: ${event.name}\ndo resolve — choose an event action\ndo use <item> · do discard <item>\npause · fetch`);
      for (const option of event.options) context.write(`do resolve ${option.id} — ${option.label}${available(current, option) ? '' : ' [unavailable]'}`);
      context.write('do resolve endure — wait out the danger; lose 12 hull');
    } else if (current.destination) context.write(`IN TRANSIT: ${planet(current.destination).name}, ${current.remaining} distance\ndo travel · do use <item> · do discard <item>\npause · fetch`);
    else context.write(`DOCKED: ${planet(current.location).name}\ndo market · do buy <cargo> <quantity> · do sell <cargo> <quantity>\ndo refuel <quantity> · do repair <quantity>\ndo equip <item> · do use <item> · do discard <item>\ndo depart <planet>\npause · fetch`);
  }
  // 为无参数的业务动作复用通用流内选择接口。
  async function select(context: CommandContext, prompt: string, choices: Choice[]): Promise<string> { return context.choose({ prompt, choices }); }
  // 逐字输出事件叙事，再以选择或 do resolve 参数结算。
  async function resolve(context: CommandContext, choice?: string): Promise<void> {
    const current = run();
    if (!current.pending) throw new Error('There is no event to resolve.');
    const event = eventById(current.pending);
    if (!choice) {
      const message = renderMarkdown(`## ${event.name}\n${event.text}`);
      context.write(message);
      await typewrite({ element: message, signal: context.signal, interval: 7 });
      const choices: Choice[] = [];
      for (const option of event.options) choices.push({ value: option.id, label: option.label, disabled: !available(current, option) });
      choices.push({ value: 'endure', label: 'Wait out the danger: lose 12 hull' });
      choice = await select(context, 'Choose an event action', choices);
    }
    context.signal.throwIfAborted();
    context.write(resolveEvent(current, choice));
    update(context);
    if (!finish(context)) await showArrival(context);
  }
  // 输出当前港口全部商品及装备的可读报价。
  function market(context: CommandContext, current: Run): void {
    requirePort(current);
    context.write(`${planet(current.location).name.toUpperCase()} MARKET — buy / sell / owned`);
    for (const good of goods) context.write(`${good.id.padEnd(10)} ${String(price(current, good.id)).padStart(4)} / ${String(price(current, good.id, false)).padStart(4)} / ${current.cargo[good.id] ?? 0}`);
    context.write('EQUIPMENT — use do equip <id>');
    for (const entry of shopItems(current.location)) context.write(`${entry.id.padEnd(10)} ${Math.floor(entry.price * (current.items.includes('broker') ? 0.92 : 1))} credits · ${entry.name}`);
  }
  // 执行与当前事件状态匹配的具体子命令。
  async function act(context: CommandContext): Promise<void> {
    const current = run();
    requireAlive(current);
    if (!current.pending) await showArrival(context);
    const [command, first, second] = context.args;
    if (!command) { actions(context); return; }
    if (command === 'resolve') { await resolve(context, first); return; }
    if (command === 'use' || command === 'discard') {
      let id = first;
      if (!id) {
        const choices: Choice[] = [];
        for (const owned of current.items) choices.push({ value: owned, label: item(owned).name });
        if (!choices.length) throw new Error('Your inventory is empty.');
        id = await select(context, 'Choose an item', choices);
      }
      if (command === 'use') useItem(current, id);
      else {
        const entry = item(id);
        const index = current.items.indexOf(entry.id);
        if (index < 0) throw new Error('This item is not in your inventory.');
        if (['tank', 'plating', 'hold'].includes(entry.id)) throw new Error('Capacity equipment remains installed for this voyage.');
        current.items.splice(index, 1);
      }
      context.write(`${command === 'use' ? 'Used' : 'Discarded'} ${item(id).name}.`);
    } else if (current.pending) throw new Error('Resolve the current event first: do resolve.');
    else if (command === 'travel') {
      if (first) throw new Error('Usage: do travel. Choose the destination with do depart <planet>.');
      const message = travel(current);
      update(context);
      if (finish(context)) return;
      await context.nextScene();
      await animatedOutput(context, message);
      await resolve(context);
      return;
    } else if (command === 'depart') {
      let destination = first;
      if (!destination) {
        const choices: Choice[] = [];
        for (const world of planets) if (world.id !== current.location) choices.push({ value: world.id, label: `${world.name} · ${distance(current.location, world.id)} distance · ${world.specialty}` });
        destination = await select(context, 'Choose your next destination', choices);
      }
      depart(current, destination);
      update(context);
      await context.nextScene();
      await animatedOutput(context, `Course set for ${planet(destination).name}: ${current.remaining} distance. Use do travel to advance one turn.`);
    } else if (command === 'market') market(context, current);
    else if (command === 'buy' || command === 'sell') {
      requirePort(current);
      let good = first;
      if (!good) {
        const choices: Choice[] = [];
        for (const entry of goods) choices.push({ value: entry.id, label: `${entry.name} · ${price(current, entry.id, command === 'buy')} credits` });
        good = await select(context, 'Choose cargo', choices);
      }
      const amount = quantity(second ?? await context.read({ prompt: 'Quantity:' }));
      trade(current, good, amount, command === 'buy');
      context.write(`${command === 'buy' ? 'Bought' : 'Sold'} ${amount} ${good}. Credits: ${current.credits}.`);
    } else if (command === 'refuel' || command === 'repair') {
      const amount = quantity(first ?? await context.read({ prompt: `${command === 'refuel' ? 'Fuel (3 credits/unit)' : 'Hull (4 credits/unit)'} quantity:` }));
      service(current, command === 'refuel' ? 'fuel' : 'hull', amount);
      context.write(`${command === 'refuel' ? 'Fuel' : 'Hull'}: ${command === 'refuel' ? current.fuel : current.hull}. Credits: ${current.credits}.`);
    } else if (command === 'equip') {
      let id = first;
      if (!id) {
        const choices: Choice[] = [];
        for (const entry of shopItems(current.location)) choices.push({ value: entry.id, label: `${entry.name} · ${entry.price} credits` });
        id = await select(context, 'Choose an item to buy', choices);
      }
      buyItem(current, id);
      context.write(`Purchased ${item(id).name}. Items: ${current.items.length}/6.`);
    } else throw new Error(`Unknown action: ${command}. Use do for available actions.`);
    update(context);
  }
  // 查询候选仅包括图表、星球和道具，保留独立信息概要。
  function completeFetch({ args }: CompletionContext): readonly CompletionCandidate[] {
    if (args.length) return [];
    const result: CompletionCandidate[] = [];
    if (active) result.push({ value: 'history', description: 'Credit history' }, { value: 'cargo', description: 'Cargo manifest' });
    for (const world of planets) result.push({ value: world.id, description: world.description });
    for (const entry of items) result.push({ value: entry.id, description: entry.name });
    return result;
  }
  // 按阶段和参数位置构造可执行候选，游戏内容留在消费端。
  function completeDo({ args }: CompletionContext): readonly CompletionCandidate[] {
    if (!active || paused || active.ended) return [];
    const current = active;
    const usable: CompletionCandidate[] = [];
    for (const id of current.items) {
      if (item(id).consumable) usable.push({ value: id, description: item(id).name });
    }
    const discards: CompletionCandidate[] = [];
    for (const id of current.items) if (!['tank', 'plating', 'hold'].includes(id)) discards.push({ value: id, description: item(id).name });
    const actions: CompletionCandidate[] = [];
    if (usable.length) actions.push({ value: 'use', description: 'Activate a carried consumable' });
    if (discards.length) actions.push({ value: 'discard', description: 'Release an item slot' });
    if (current.pending) actions.push({ value: 'resolve', description: 'Choose an event action' });
    else if (current.destination) actions.push({ value: 'travel', description: 'Advance one travel turn' });
    else {
      actions.push({ value: 'market', description: 'Show local cargo and three equipment offers' }, { value: 'depart', description: 'Choose the next planet' });
      let canBuy = false;
      for (const good of goods) if (price(current, good.id) <= current.credits) canBuy = true;
      if (canBuy && cargoCount(current) < capacity(current, 'cargo')) actions.push({ value: 'buy', description: 'Buy local cargo' });
      if (cargoCount(current)) actions.push({ value: 'sell', description: 'Sell carried cargo' });
      if (current.fuel < capacity(current, 'fuel') && current.credits >= 3) actions.push({ value: 'refuel', description: 'Fuel costs 3 credits per unit' });
      if (current.hull < capacity(current, 'hull') && current.credits >= 4) actions.push({ value: 'repair', description: 'Repair costs 4 credits per unit' });
      let canEquip = false;
      for (const entry of shopItems(current.location)) {
        const cost = Math.floor(entry.price * (current.items.includes('broker') ? 0.92 : 1));
        if (cost <= current.credits && (entry.consumable || !current.items.includes(entry.id))) canEquip = true;
      }
      if (current.items.length < 6 && canEquip) actions.push({ value: 'equip', description: 'Buy one of three local items' });
    }
    if (!args.length) return actions;
    if (args.length > 1) return [];
    const action = args[0];
    if (action === 'use') return usable;
    if (action === 'discard') return discards;
    if (current.pending && action === 'resolve') {
      const result: CompletionCandidate[] = [{ value: 'endure', description: 'Wait out danger: lose 12 hull' }];
      for (const option of eventById(current.pending).options) if (available(current, option)) result.push({ value: option.id, description: option.label });
      return result;
    }
    if (current.pending || current.destination) return [];
    const result: CompletionCandidate[] = [];
    if (action === 'depart') for (const world of planets) {
      if (world.id !== current.location) result.push({ value: world.id, description: `${distance(current.location, world.id)} distance · ${world.specialty}` });
    }
    if (action === 'buy' || action === 'sell') for (const good of goods) {
      if (action === 'sell' && !(current.cargo[good.id] ?? 0)) continue;
      if (action === 'buy' && price(current, good.id) > current.credits) continue;
      result.push({ value: good.id, description: `${good.name} · ${price(current, good.id, action === 'buy')} credits` });
    }
    if (action === 'equip' && current.items.length < 6) for (const entry of shopItems(current.location)) {
      if ((!entry.consumable && current.items.includes(entry.id)) || current.credits < Math.floor(entry.price * (current.items.includes('broker') ? 0.92 : 1))) continue;
      result.push({ value: entry.id, description: `${entry.name} · ${entry.price} credits` });
    }
    return result;
  }
  const commands: Commands = {
    help: { description: 'Commands and voyage rules.', run: help }, about: { description: 'About LuanrMerchant.', run: about },
    play: { description: 'Choose one of three save slots.', run: play }, pause: { description: 'Save, exit, or continue.', run: pause, interruptRunning: true },
    fetch: { description: 'Ship, history, planet, or item details.', run: fetch, complete: completeFetch }, do: { description: 'Take an available action.', run: act, complete: completeDo },
  };
  return { commands, prompt };
}
