const { baseAttack, lbAttack } = require('./chardata.json');
const { bondData } = require('./bonddata.json');
const { cubeData } = require('./cubedata.json');
const { gearData, gearSubs } = require('./geardata.json');
const { recycleValuePerLvl } = require('./recycledata.json');

// fuction to calculate ATK, PP and PP elem bonus
// selected Nikke - nikke data from chardata, gear and cube are arrays, rr_manulvl - lvl of needed manu
function APBM(selectedNikke, s1, s2, burst, lb, core, bond, gear, cube, rr_manulvl) {
	// starting values (<1!!!)
	const skillSV = 0.65;
	const gearSV = 0;
	const statSV = 0.7;
	const refPP = 9000;
	let ammoMultiplier = 1;

	// calculating attack and ref atk for pp
	let attack = baseAttack.find(c => c.class = selectedNikke.class).value;
	let refAttack = attack;
	attack += lb * (attack * 0.02 + lbAttack);
	refAttack += 3 * (refAttack * 0.02 + lbAttack);
	attack += recycleValuePerLvl.manufacturer.atk * rr_manulvl;
	refAttack += recycleValuePerLvl.manufacturer.atk * 50;
	attack += bondData.find(c => c.class === selectedNikke.class).atkValues.at(bond - 1);
	refAttack += bondData.find(c => c.class === selectedNikke.class).atkValues.at(29);
	attack *= (1 + 0.02 * core);
	// calculating pp
	// skill multiplier
	const skillQuality = (s1 * selectedNikke.skillMultipliers.s1 + s2 * selectedNikke.skillMultipliers.s2 + burst * selectedNikke.skillMultipliers.burst) / (10 * (selectedNikke.skillMultipliers.s1 + selectedNikke.skillMultipliers.s2 + selectedNikke.skillMultipliers.burst));
	const skillX = (10 - selectedNikke.powerMultipliers.skills) * (1 - skillSV) / 10;
	const skillMultiplier = (skillSV + skillX + (1 - skillSV - skillX) * skillQuality);
	// gear/attack multiplier
	const refGear = gearData.find(t => t.tier === 'T10').values.find(c => c.class === selectedNikke.class).gear;
	refAttack += 1.5 * (refGear.at(0).atk + refGear.at(1).atk + refGear.at(2).atk + refGear.at(3).atk);
	refAttack += cubeData.basicValues.atk.at(6);
	for (const piece of gear) {
		let tier = piece.tier;
		let manuBonus = 0;
		if (tier === 'T9M') {
			tier = 'T9';
			manuBonus = 3;
		}
		if (tier === 'T9' || tier === 'T10') {
			const baseValue = gearData.find(t => t.tier === tier).values.find(c => c.class === selectedNikke.class).gear.find(p => p.gtype === piece.gtype).atk;
			attack += baseValue * (1 + 0.1 * (manuBonus + piece.lvl));
		}
	}
	for (const cub of cube) {
		attack += cubeData.basicValues.atk.at(cub.lvl - 1);
	}
	const gearQuality = attack / refAttack;
	const gearX = (10 - selectedNikke.powerMultipliers.equip) * (1 - gearSV) / 10;
	const gearMultiplier = (gearSV + gearX + (1 - gearSV - gearX) * gearQuality);
	// stats multiplier
	const statMultiValues = selectedNikke.statMultipliers.sort((a, b) => b.value - a.value);
	let refStats = 0;
	for (let i = 0, k = 0; i < 3; i++) {
		// elemental damage should be like bonus so not counted
		if (statMultiValues.at(i + k).attribute === 'Element Damage Dealt') {
			k++;
		}
		refStats += statMultiValues.at(i + k).value * 4;
	}
	let nikkeStats = 0;
	let elemValue = 10;
	let ammo = selectedNikke.ammo;
	const ammoVal = [];
	for (const cub of cube) {
		const selectedCube = cubeData.cubes.find(c => c.ctype === cub.ctype);
		if (!selectedCube) { break; }
		const cubeAtt = selectedCube.attribute;
		if (cubeAtt === 'Ammo Multiplier') {
			ammoMultiplier = selectedCube.values.at(cub.lvl - 1);
			const statValue = selectedNikke.statMultipliers.find(s => s.attribute === 'Max Ammunition Capacity').value;
			nikkeStats += statValue * 100 * (ammoMultiplier - 1) / gearSubs.find(s => s.attribute === 'Max Ammunition Capacity').values.at(6);
		}
		else {
			const statValue = selectedNikke.statMultipliers.find(s => s.attribute === cubeAtt).value;
			const gearAtt = gearSubs.find(s => s.attribute === cubeAtt);
			if (gearAtt) {
				nikkeStats += statValue * selectedCube.values.at(cub.lvl - 1) / gearSubs.find(s => s.attribute === cubeAtt).values.at(6);
				if (cubeAtt === 'Max Ammunition Capacity') {
					ammo += Math.round(selectedCube.values.at(cub.lvl - 1) * selectedNikke.ammo / 100);
				}
			}
			else {
				nikkeStats += statValue * selectedCube.values.at(cub.lvl - 1) / selectedCube.values.at(6);
			}
		}
		elemValue += cubeData.basicValues.elem.at(cub.lvl - 1);
	}
	for (const piece of gear) {
		for (const stat of piece.subs) {
			if (stat.attribute === 'Element Damage Dealt') {
				elemValue += stat.value;
			}
			else if (stat.attribute === 'Max Ammunition Capacity') {
				const statValue = selectedNikke.statMultipliers.find(s => s.attribute === stat.attribute).value;
				nikkeStats += statValue * stat.value * ammoMultiplier / gearSubs.find(s => s.attribute === stat.attribute).values.at(6);
				if (ammoVal.find(e => e.val === stat.value)) {
					ammoVal.find(e => e.val === stat.value).count += 1;
				}
				else {
					ammoVal.push({ val: stat.value, count: 1 });
				}
			}
			else {
				const statValue = selectedNikke.statMultipliers.find(s => s.attribute === stat.attribute).value;
				nikkeStats += statValue * stat.value / gearSubs.find(s => s.attribute === stat.attribute).values.at(6);
			}
		}
	}
	for (const val of ammoVal) {
		ammo += Math.round(selectedNikke.ammo * val.count * val.val / 100);
	}
	const gearElemMultiplier = (1 - gearSV - gearX) * gearQuality * (elemValue / 100);
	const statQuality = nikkeStats / refStats;
	const statX = (10 - selectedNikke.powerMultipliers.stats) * (1 - statSV) / 10;
	const statMultiplier = statSV + statX + (1 - statSV - statX) * statQuality;
	const pp = skillMultiplier * gearMultiplier * statMultiplier * refPP;
	const pp_elem = skillMultiplier * gearElemMultiplier * statMultiplier * refPP * selectedNikke.elemMultiplier;


	return { attack: attack, pp: pp, pp_elem: pp_elem, ammo: ammo };
}

module.exports = { APBM };