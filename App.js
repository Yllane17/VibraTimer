import React, { useState, useRef, useEffect, useMemo, createContext, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Vibration, Animated,
  Easing, StatusBar, Platform, ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// ───────── THÈMES (violet = maquette d'origine) ─────────
const DARK = { text: '#FFFFFE', muted: '#9CA3AF', tick: '#6B7280', label: '#D1D5DB', ok: '#34D399', warn: '#FBBF24', danger: '#DC2626', bar: 'light-content' };
const LIGHT = { text: '#1B1A26', muted: '#6B7280', tick: '#9CA3AF', label: '#374151', ok: '#059669', warn: '#B45309', danger: '#DC2626', bar: 'dark-content' };

const THEMES = {
  violet: { ...DARK, name: 'Violet', bg: '#0F0E17', card: '#1B1A26', border: '#2A283D', accent: '#7C4DFF', accentHover: '#A07CFF', accentDark: '#651FFF', onAccent: '#FFFFFF' },
  clair:  { ...LIGHT, name: 'Clair', bg: '#F6F4FF', card: '#FFFFFF', border: '#E2DDF3', accent: '#7C4DFF', accentHover: '#5B2EE0', accentDark: '#651FFF', onAccent: '#FFFFFF' },
  ocean:  { ...DARK, name: 'Océan', bg: '#07131F', card: '#0E2236', border: '#1B3A57', accent: '#38A3FF', accentHover: '#7CC4FF', accentDark: '#1E7FDB', onAccent: '#04121F' },
  teal:   { ...DARK, name: 'Menthe', bg: '#06181C', card: '#0D2A30', border: '#1A444D', accent: '#1DE9B6', accentHover: '#64FFDA', accentDark: '#00BFA5', onAccent: '#04211C' },
  orange: { ...DARK, name: 'Orange', bg: '#140D09', card: '#221711', border: '#3A2A1F', accent: '#FF7A3D', accentHover: '#FFA070', accentDark: '#E65A1A', onAccent: '#1A0C04' },
  rose:   { ...DARK, name: 'Rose', bg: '#150A10', card: '#25121C', border: '#3D2030', accent: '#FF4D8D', accentHover: '#FF86B2', accentDark: '#E0206B', onAccent: '#FFFFFF' },
};

const ThemeCtx = createContext(null);
const useTheme = () => useContext(ThemeCtx);

// ───────── Vibration : intensité simulée par impulsions (Expo Go) ─────────
function vibrateWithIntensity(durationMs, percent) {
  Vibration.cancel();
  if (percent >= 100) return Vibration.vibrate(durationMs);
  const cycle = 100;
  const on = Math.max(10, Math.round((cycle * percent) / 100));
  const pattern = [0];
  for (let t = 0; t < durationMs; t += cycle) pattern.push(on, cycle - on);
  Vibration.vibrate(pattern);
}

const fmt = (sec) => {
  const t = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

// ───────── Animations ─────────
const useLoop = (ms, reverse = false, delay = 0) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = (to) => Animated.timing(v, { toValue: to, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const seq = reverse ? [t(1), t(0)] : [Animated.delay(delay), t(1)];
    const loop = Animated.loop(Animated.sequence(seq));
    loop.start();
    return () => loop.stop();
  }, []);
  return v;
};

const Ring = ({ delay }) => {
  const { C } = useTheme();
  const v = useLoop(2000, false, delay);
  return (
    <Animated.View style={{
      position: 'absolute', width: 260, height: 260, borderRadius: 130,
      borderWidth: 2, borderColor: C.accent,
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.27, 1] }) }],
    }} />
  );
};

const PingDot = () => {
  const { C } = useTheme();
  const v = useLoop(1500);
  return (
    <View style={{ width: 8, height: 8, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
      }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} />
    </View>
  );
};

// ───────── Composants ─────────
const Btn = ({ label, icon, onPress, variant = 'primary' }) => {
  const { C, s } = useTheme();
  const v = {
    primary: { bg: C.accent, fg: C.onAccent, bd: C.accent },
    danger: { bg: C.danger, fg: '#fff', bd: C.danger },
    outline: { bg: 'transparent', fg: C.text, bd: C.border },
  }[variant];
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}
      style={[s.btn, { backgroundColor: v.bg, borderColor: v.bd }]}>
      {icon && <Icon name={icon} size={20} color={v.fg} />}
      <Text style={[s.btnTxt, { color: v.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const Card = ({ icon, label, value, children }) => {
  const { C, s } = useTheme();
  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.rowL}>
          <Icon name={icon} size={16} color={C.accent} />
          <Text style={s.label}>{label}</Text>
        </View>
        <Text style={s.value}>{value}</Text>
      </View>
      {children}
    </View>
  );
};

const Bounce = ({ style, children }) => {
  const v = useLoop(600, true);
  return (
    <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }]}>
      {children}
    </Animated.View>
  );
};

const Pulse = ({ style, children }) => {
  const v = useLoop(1000, true);
  return (
    <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }]}>
      {children}
    </Animated.View>
  );
};

// ───────── Écran de démarrage (loader) ─────────
const Splash = ({ onStart }) => {
  const { C, s } = useTheme();
  const prog = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Animated.timing(prog, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.cubic), useNativeDriver: false })
      .start(() => {
        setReady(true);
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
  }, []);

  return (
    <View style={s.fill}>
      <View style={s.center}>
        <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
          <Ring delay={0} /><Ring delay={700} /><Ring delay={1400} />
          <Bounce style={s.phoneIcon}><Icon name="vibrate" size={44} color={C.accent} /></Bounce>
        </View>
        <Text style={[s.h1, { marginTop: 8 }]}>VibraTimer</Text>
        <Text style={[s.muted, { marginTop: 6, textAlign: 'center', lineHeight: 20 }]}>
          Programmez vos vibrations{'\n'}en quelques secondes
        </Text>
      </View>

      <View style={{ height: 110, justifyContent: 'flex-end' }}>
        {!ready ? (
          <View>
            <View style={s.bar}>
              <Animated.View style={[s.barFill, { width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
            <Text style={[s.muted, { textAlign: 'center', marginTop: 10 }]}>Chargement…</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fade }}>
            <Btn label="Let's go VibraTimer" icon="rocket-launch-outline" onPress={onStart} />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

// ───────── Application ─────────
export default function App() {
  const [themeKey, setThemeKey] = useState('violet');
  const C = THEMES[themeKey];
  useEffect(() => {
    AsyncStorage.getItem('vibratimer-theme')
      .then((k) => { if (k && THEMES[k]) setThemeKey(k); })
      .catch(() => {});
  }, []);
  const chooseTheme = (k) => {
    setThemeKey(k);
    AsyncStorage.setItem('vibratimer-theme', k).catch(() => {});
  };
  const s = useMemo(() => makeStyles(C), [themeKey]);

  const [screen, setScreen] = useState('splash'); // splash | settings | countdown | vibrating | done | info
  const [delay, setDelay] = useState(5);
  const [duration, setDuration] = useState(5);
  const [intensity, setIntensity] = useState(128);
  const [remaining, setRemaining] = useState(0);
  const timer = useRef(null);

  const pct = Math.round((intensity / 255) * 100);
  const clear = () => clearInterval(timer.current);
  useEffect(() => () => { clear(); Vibration.cancel(); }, []);

  const startVibration = () => {
    clear();
    setRemaining(duration);
    setScreen('vibrating');
    vibrateWithIntensity(duration * 1000, pct);
    const end = Date.now() + duration * 1000;
    timer.current = setInterval(() => {
      const left = (end - Date.now()) / 1000;
      if (left <= 0) { clear(); setScreen('done'); } else setRemaining(left);
    }, 100);
  };

  const start = () => {
    clear();
    if (delay <= 0) return startVibration();
    setRemaining(delay);
    setScreen('countdown');
    const end = Date.now() + delay * 1000;
    timer.current = setInterval(() => {
      const left = (end - Date.now()) / 1000;
      if (left <= 0) { clear(); startVibration(); } else setRemaining(left);
    }, 100);
  };

  const stop = () => { clear(); Vibration.cancel(); setScreen('done'); };
  const cancel = () => { clear(); Vibration.cancel(); setScreen('settings'); };

  const slider = (min, max, val, set) => (
    <Slider minimumValue={min} maximumValue={max} step={1} value={val} onValueChange={set}
      minimumTrackTintColor={C.accent} maximumTrackTintColor={C.border} thumbTintColor={C.accentHover} />
  );

  return (
    <ThemeCtx.Provider value={{ C, s }}>
      <View style={s.root}>
        <StatusBar barStyle={C.bar} backgroundColor={C.bg} />
        {screen === 'splash' && <Splash onStart={() => setScreen('settings')} />}
        {screen === 'settings' && Settings()}
        {screen === 'countdown' && Countdown()}
        {screen === 'vibrating' && Vibrating()}
        {screen === 'done' && Done()}
        {screen === 'info' && Info()}
      </View>
    </ThemeCtx.Provider>
  );

  // ── Écran 1 : Accueil / Réglages ──
  function Settings() {
    return (
      <View style={s.fill}>
        <View style={[s.row, { marginBottom: 16 }]}>
          <View style={s.rowL}>
            <View style={s.logo}><Icon name="vibrate" size={22} color={C.accent} /></View>
            <Text style={s.title}>VibraTimer</Text>
          </View>
          <TouchableOpacity onPress={() => setScreen('info')} style={{ padding: 6 }}>
            <Icon name="help-circle-outline" size={24} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
          <Card icon="clock-outline" label="Démarrer dans" value={`${delay}s`}>
            <View style={s.chips}>
              {[0, 5, 10, 15].map((n) => (
                <TouchableOpacity key={n} onPress={() => setDelay(n)}
                  style={[s.chip, delay === n && { backgroundColor: C.accent }]}>
                  <Text style={[s.chipTxt, delay === n && { color: C.onAccent, fontWeight: '700' }]}>{n}s</Text>
                </TouchableOpacity>
              ))}
            </View>
            {slider(0, 60, delay, setDelay)}
            <View style={s.row}><Text style={s.tick}>0s</Text><Text style={s.tick}>30s</Text><Text style={s.tick}>60s</Text></View>
          </Card>

          <Card icon="timer-outline" label="Durée de vibration" value={`${duration}s`}>
            {slider(1, 30, duration, setDuration)}
            <View style={s.row}><Text style={s.tick}>1s</Text><Text style={s.tick}>15s</Text><Text style={s.tick}>30s</Text></View>
          </Card>

          <Card icon="flash" label="Intensité" value={`${intensity} (${pct}%)`}>
            <View style={s.rowL}>
              <Icon name="volume-low" size={16} color={C.muted} />
              <View style={{ flex: 1 }}>{slider(1, 255, intensity, setIntensity)}</View>
              <Icon name="volume-high" size={16} color={C.accent} />
            </View>
          </Card>
          <View style={s.card}>
            <View style={[s.rowL, { marginBottom: 12 }]}>
              <Icon name="palette-outline" size={16} color={C.accent} />
              <Text style={s.label}>Thème de couleur</Text>
            </View>
            <View style={s.row}>
              {Object.entries(THEMES).map(([k, t]) => (
                <TouchableOpacity key={k} onPress={() => chooseTheme(k)} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[s.swatch, { backgroundColor: t.bg, borderColor: k === themeKey ? t.accent : C.border }]}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: t.accent }} />
                  </View>
                  <Text style={[s.tick, k === themeKey && { color: C.accentHover, fontWeight: '700' }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={{ paddingTop: 12 }}>
          <Btn label="Démarrer" icon="play" onPress={start} />
        </View>
      </View>
    );
  }

  // ── Écran 2 : Compte à rebours ──
  function Countdown() {
    const elapsed = delay > 0 ? (delay - remaining) / delay : 1;
    return (
      <View style={s.fill}>
        <Text style={s.step}>ÉTAPE 1 SUR 2</Text>
        <Text style={s.h2}>Compte à rebours</Text>

        <View style={s.center}>
          <View style={{ width: 224, height: 224, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={224} height={224} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx="50" cy="50" r="45" stroke={C.border} strokeWidth="6" fill="none" />
              <Circle cx="50" cy="50" r="45" stroke={C.accent} strokeWidth="6" fill="none"
                strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - 283 * elapsed} />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={s.big}>{fmt(remaining)}</Text>
              <Text style={s.muted}>Avant vibration</Text>
            </View>
          </View>
        </View>

        <View style={[s.card, { flexDirection: 'row', marginBottom: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.tick}>Durée choisie</Text>
            <Text style={s.bold}>{duration} secondes</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.tick}>Intensité</Text>
            <Text style={s.bold}>{intensity} ({pct}%)</Text>
          </View>
        </View>
        <Btn label="Annuler" icon="close" variant="outline" onPress={cancel} />
      </View>
    );
  }

  // ── Écran 3 : Vibration en cours ──
  function Vibrating() {
    const p = Math.max(0, Math.min(100, (remaining / duration) * 100));
    return (
      <View style={s.fill}>
        <View style={s.rowL}><PingDot /><Text style={s.step}>EN COURS</Text></View>
        <Text style={s.h2}>Vibration active...</Text>

        <View style={s.center}>
          <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
            <Ring delay={0} /><Ring delay={500} /><Ring delay={1000} />
            <Bounce style={s.phoneIcon}>
              <Icon name="vibrate" size={44} color={C.accent} />
            </Bounce>
          </View>
        </View>

        <View style={[s.card, { marginBottom: 16 }]}>
          <View style={s.row}>
            <Text style={s.muted}>Temps restant</Text>
            <Text style={s.value}>{remaining.toFixed(1)}s / {duration}s</Text>
          </View>
          <View style={s.bar}><View style={[s.barFill, { width: `${p}%` }]} /></View>
        </View>
        <Btn label="Arrêter" icon="hand-back-left" variant="danger" onPress={stop} />
      </View>
    );
  }

  // ── Écran 4 : Vibration terminée ──
  function Done() {
    return (
      <View style={s.fill}>
        <View style={[s.center, { gap: 16 }]}>
          <Pulse style={s.okBadge}>
            <Icon name="check" size={48} color={C.ok} />
          </Pulse>
          <Text style={s.h1}>Terminé !</Text>
          <Text style={[s.muted, { textAlign: 'center', maxWidth: 240 }]}>
            La séquence de vibration s'est achevée avec succès.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Btn label="Recommencer" icon="restart" onPress={start} />
          <Btn label="Retour aux réglages" icon="arrow-left" variant="outline" onPress={() => setScreen('settings')} />
        </View>
      </View>
    );
  }

  // ── Écran 5 : Avertissement / Erreur ──
  function Info() {
    return (
      <View style={s.fill}>
        <Text style={[s.step, { color: C.warn }]}>AVERTISSEMENT</Text>
        <View style={[s.center, { gap: 14, paddingHorizontal: 8 }]}>
          <View style={s.warnBadge}><Icon name="alert" size={36} color={C.warn} /></View>
          <Text style={[s.h2, { textAlign: 'center' }]}>Contrôle de l'intensité non supporté</Text>
          <Text style={[s.muted, { textAlign: 'center', lineHeight: 20 }]}>
            Cet appareil ne possède pas le moteur haptique compatible avec l'ajustement dynamique de l'amplitude.
          </Text>
          <View style={[s.card, { flexDirection: 'row', gap: 8, width: '100%' }]}>
            <Icon name="information-outline" size={16} color={C.accent} />
            <Text style={[s.muted, { flex: 1, fontSize: 12 }]}>
              Dans Expo Go, l'intensité est simulée par impulsions : plus elle est faible, plus les pulsations sont courtes.
            </Text>
          </View>
        </View>
        <Btn label="Compris, continuer" onPress={() => setScreen('settings')} />
      </View>
    );
  }
}

// ───────── Styles ─────────
const makeStyles = (C) => StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg, padding: 20,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 50) + 12,
    paddingBottom: 24,
  },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowL: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 38, height: 38, borderRadius: 16, backgroundColor: C.accent + '33',
    borderWidth: 1, borderColor: C.accent + '66', alignItems: 'center', justifyContent: 'center',
  },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: C.text },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: C.label },
  value: { fontSize: 14, fontWeight: '700', color: C.accentHover },
  tick: { fontSize: 10, color: C.tick },
  muted: { fontSize: 13, color: C.muted },
  bold: { fontSize: 14, fontWeight: '600', color: C.text },
  chips: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  chip: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center' },
  chipTxt: { fontSize: 12, color: C.muted, fontWeight: '500' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, borderWidth: 1,
  },
  btnTxt: { fontSize: 16, fontWeight: '700' },
  step: { fontSize: 12, fontWeight: '600', color: C.accentHover, letterSpacing: 1 },
  h1: { fontSize: 28, fontWeight: '700', color: C.text },
  h2: { fontSize: 19, fontWeight: '700', color: C.text },
  big: { fontSize: 44, fontWeight: '800', color: C.text },
  bar: { height: 12, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, marginTop: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 8 },
  phoneIcon: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: C.accent + '33',
    borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },
  okBadge: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: C.ok + '1A',
    borderWidth: 2, borderColor: C.ok, alignItems: 'center', justifyContent: 'center',
  },
  warnBadge: {
    width: 80, height: 80, borderRadius: 28, backgroundColor: C.warn + '1A',
    borderWidth: 1, borderColor: C.warn + '66', alignItems: 'center', justifyContent: 'center',
  },
});