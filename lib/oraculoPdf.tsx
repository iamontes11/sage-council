import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { OraculoResult } from '@/types';
import { formatSpanishDate } from './oraculo';

const PAPER = '#f7f3ea';
const INK = '#1c1a17';
const INK_SOFT = '#4a463f';
const ACCENT = '#8a1f11';

const styles = StyleSheet.create({
  page: { backgroundColor: PAPER, padding: 36, fontFamily: 'Helvetica', color: INK },
  masthead: {
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: INK,
    paddingBottom: 10,
    marginBottom: 4,
  },
  title: { fontFamily: 'Times-Bold', fontSize: 34, letterSpacing: 3 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: INK,
    marginTop: 6,
    paddingTop: 4,
  },
  metaText: { fontSize: 8, letterSpacing: 1, color: INK_SOFT, textTransform: 'uppercase' },
  headline: { fontFamily: 'Times-Italic', fontSize: 11, color: INK_SOFT, marginTop: 8 },
  banner: {
    backgroundColor: ACCENT,
    color: PAPER,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textAlign: 'center',
    padding: 8,
    marginTop: 14,
  },
  body: { flexDirection: 'row', marginTop: 16 },
  mainCol: { flexDirection: 'column', flexGrow: 2, flexBasis: 0, paddingRight: 20 },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: INK_SOFT,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 3,
    marginBottom: 10,
  },
  item: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(28,26,23,0.3)', paddingVertical: 8 },
  itemDecision: { backgroundColor: 'rgba(138,31,17,0.06)', paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: ACCENT },
  itemTime: { fontSize: 7, letterSpacing: 1, color: ACCENT, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  itemTitle: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 3 },
  itemTitleMain: { fontSize: 20, marginBottom: 4 },
  itemDetail: { fontSize: 9.5, lineHeight: 1.4, color: INK },
  itemDetailMain: { fontSize: 11 },
  itemFlag: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: ACCENT, marginTop: 4 },
  sidebar: { flexGrow: 1, flexBasis: 0, borderLeftWidth: 0.5, borderLeftColor: 'rgba(28,26,23,0.3)', paddingLeft: 16 },
  sidebarSection: { marginBottom: 16 },
  sidebarTitle: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: INK_SOFT,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingBottom: 3,
    marginBottom: 8,
  },
  sidebarItem: { fontSize: 8.5, color: INK_SOFT, lineHeight: 1.4, marginBottom: 6 },
  sidebarPattern: { fontSize: 8.5, fontFamily: 'Times-Italic', color: INK_SOFT, lineHeight: 1.4 },
});

// The standard PDF fonts (WinAnsiEncoding) don't cover arrows/emoji — sanitize
// anything free-form (LLM output, pasted brief text) before it hits the page.
function sanitize(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/⚠/g, '!')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
}

/** Renders the "periódico matutino" as a compressed PDF buffer — real vector text, small and legible. */
export async function renderOraculoPdf(dateISO: string, result: OraculoResult): Promise<Buffer> {
  const dateLabel = formatSpanishDate(dateISO);
  const headline = sanitize(result.headline);
  const items = result.items.map((item) => ({ ...item, title: sanitize(item.title), detail: sanitize(item.detail) }));
  const pendingDecision = result.pendingDecision ? sanitize(result.pendingDecision) : null;
  const backgroundTasks = (result.backgroundTasks || []).map(sanitize);
  const pattern = result.pattern ? sanitize(result.pattern) : null;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.masthead}>
          <Text style={styles.title}>EL ORÁCULO</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{dateLabel}</Text>
            <Text style={styles.metaText}>Edición matutina de Ignacio</Text>
          </View>
          <Text style={styles.headline}>{headline}</Text>
        </View>

        {pendingDecision ? (
          <Text style={styles.banner}>{`DECISIÓN PENDIENTE — ${pendingDecision}`}</Text>
        ) : null}

        <View style={styles.body}>
          <View style={styles.mainCol}>
            <Text style={styles.sectionLabel}>Itinerario del día</Text>
            {items.map((item, i) => (
              <View key={i} style={[styles.item, item.needsDecision ? styles.itemDecision : {}]}>
                <Text style={styles.itemTime}>{item.time}</Text>
                <Text style={[styles.itemTitle, item.isMain ? styles.itemTitleMain : {}]}>{item.title}</Text>
                <Text style={[styles.itemDetail, item.isMain ? styles.itemDetailMain : {}]}>{item.detail}</Text>
                {item.needsDecision ? <Text style={styles.itemFlag}>Requiere tu decisión</Text> : null}
              </View>
            ))}
          </View>

          <View style={styles.sidebar}>
            {backgroundTasks.length > 0 ? (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarTitle}>Tareas de fondo</Text>
                {backgroundTasks.map((t, i) => (
                  <Text key={i} style={styles.sidebarItem}>{`• ${t}`}</Text>
                ))}
              </View>
            ) : null}

            {pattern ? (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarTitle}>Patrón detectado</Text>
                <Text style={styles.sidebarPattern}>{pattern}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
