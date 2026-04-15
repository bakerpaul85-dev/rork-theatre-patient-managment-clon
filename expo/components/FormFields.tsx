import React, { useState, ReactNode } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal,
  FlatList, Platform, TextInputProps,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Search, X, ChevronDown, CheckCircle, Square, CheckSquare, XCircle } from 'lucide-react-native';

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <View style={fs.field}>
      <Text style={fs.label}>
        {label}{required ? <Text style={{ color: Colors.danger }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      style={fs.input}
      placeholderTextColor={Colors.textTertiary}
      {...props}
    />
  );
}

interface SectionCardProps {
  title: string;
  children: ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View style={fs.section}>
      <Text style={fs.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={fs.row}>{children}</View>;
}

interface PickerFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  required?: boolean;
}

export function PickerField({ label, value, options, onChange, required }: PickerFieldProps) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Field label={label} required={required}>
      <TouchableOpacity style={fs.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={value ? fs.pickerTxt : fs.pickerPh} numberOfLines={1}>
          {value || `Select ${label.toLowerCase()}...`}
        </Text>
        <ChevronDown size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={fs.overlay}>
          <View style={fs.sheet}>
            <View style={fs.sheetHeader}>
              <Text style={fs.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[fs.sheetItem, item === value && fs.sheetItemActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[fs.sheetItemTxt, item === value && fs.sheetItemTxtActive]}>
                    {item}
                  </Text>
                  {item === value && <CheckCircle size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </Field>
  );
}

interface SearchPickerFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  required?: boolean;
}

export function SearchPickerField({ label, value, options, onChange, required }: SearchPickerFieldProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : [...options];

  return (
    <Field label={label} required={required}>
      <TouchableOpacity style={fs.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={value ? fs.pickerTxt : fs.pickerPh} numberOfLines={1}>
          {value || 'Search...'}
        </Text>
        <Search size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={fs.overlay}>
          <View style={fs.sheet}>
            <View style={fs.sheetHeader}>
              <Text style={fs.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={fs.searchRow}>
              <Search size={15} color={Colors.textSecondary} />
              <TextInput
                style={fs.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <XCircle size={15} color={Colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[fs.sheetItem, item === value && fs.sheetItemActive]}
                  onPress={() => { onChange(item); setOpen(false); setQuery(''); }}
                >
                  <Text style={[fs.sheetItemTxt, item === value && fs.sheetItemTxtActive]}>
                    {item}
                  </Text>
                  {item === value && <CheckCircle size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </Field>
  );
}

interface MultiPickerFieldProps {
  label: string;
  values: string[];
  options: { code: string; name: string }[];
  onChange: (v: string[]) => void;
}

export function MultiPickerField({ label, values, options, onChange }: MultiPickerFieldProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const filtered = query
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()) || o.code.includes(query))
    : options;

  const toggle = (code: string) => {
    onChange(values.includes(code) ? values.filter(v => v !== code) : [...values, code]);
  };

  return (
    <Field label={label}>
      <TouchableOpacity style={fs.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={values.length ? fs.pickerTxt : fs.pickerPh} numberOfLines={1}>
          {values.length ? `${values.length} procedure${values.length !== 1 ? 's' : ''} selected` : 'Select procedures...'}
        </Text>
        <ChevronDown size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
      {values.length > 0 && (
        <View style={fs.multiTags}>
          {values.map(v => {
            const opt = options.find(o => o.code === v);
            return (
              <TouchableOpacity key={v} style={fs.tag} onPress={() => toggle(v)}>
                <Text style={fs.tagTxt} numberOfLines={1}>
                  {opt ? `${opt.code} - ${opt.name}` : v}
                </Text>
                <XCircle size={13} color={Colors.primary} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <Modal visible={open} transparent animationType="slide">
        <View style={fs.overlay}>
          <View style={fs.sheet}>
            <View style={fs.sheetHeader}>
              <Text style={fs.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => { setOpen(false); setQuery(''); }}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={fs.searchRow}>
              <Search size={15} color={Colors.textSecondary} />
              <TextInput
                style={fs.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search by code or name..."
                placeholderTextColor={Colors.textTertiary}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const checked = values.includes(item.code);
                return (
                  <TouchableOpacity
                    style={[fs.sheetItem, checked && fs.sheetItemActive]}
                    onPress={() => toggle(item.code)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[fs.sheetItemTxt, checked && fs.sheetItemTxtActive]}>
                        {item.code} — {item.name}
                      </Text>
                    </View>
                    {checked
                      ? <CheckSquare size={20} color={Colors.primary} />
                      : <Square size={20} color={Colors.borderStrong} />
                    }
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </Field>
  );
}

const fs = StyleSheet.create({
  field: { marginBottom: 12 },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.7,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  row: { flexDirection: 'row' as const, gap: 10 },
  pickerBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: Colors.white,
  },
  pickerTxt: { fontSize: 14, color: Colors.text, flex: 1 },
  pickerPh: { fontSize: 14, color: Colors.textTertiary, flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '75%',
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  searchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Colors.background,
    borderRadius: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  sheetItem: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  sheetItemActive: { backgroundColor: Colors.primaryLight },
  sheetItemTxt: { fontSize: 14, color: Colors.text, flex: 1 },
  sheetItemTxtActive: { color: Colors.primary, fontWeight: '600' as const },
  multiTags: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagTxt: { fontSize: 12, color: Colors.primary, maxWidth: 200 },
});
