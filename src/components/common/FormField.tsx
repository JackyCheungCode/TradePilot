import { NumberInput as CarbonNumberInput, Select as CarbonSelect, SelectItem, TextInput as CarbonTextInput, type NumberInputProps as CarbonNumberInputProps, type SelectProps as CarbonSelectProps, type TextInputProps as CarbonTextInputProps } from "@carbon/react";
import type { ReactNode } from "react";
type SharedFieldProps = { id:string; labelText:ReactNode; helperText?:ReactNode; invalid?:boolean; invalidText?:ReactNode };
export type TextInputProps = Omit<CarbonTextInputProps,"id"|"labelText"|"helperText"|"invalid"|"invalidText"> & SharedFieldProps;
export function TextInput({id,labelText,helperText,invalid=false,invalidText,...props}:TextInputProps) {
 return <CarbonTextInput {...props} id={id} labelText={labelText} helperText={helperText} invalid={invalid} invalidText={invalidText}/>;
}
export type SelectOption = {value:string;text:string;disabled?:boolean};
export type SelectProps = Omit<CarbonSelectProps,"id"|"labelText"|"helperText"|"invalid"|"invalidText"|"children"> & SharedFieldProps & {items:SelectOption[];placeholder?:string};
export function Select({id,labelText,helperText,invalid=false,invalidText,items,placeholder="请选择",...props}:SelectProps) {
 return <CarbonSelect {...props} id={id} labelText={labelText} helperText={helperText} invalid={invalid} invalidText={invalidText}>
  <SelectItem value="" text={placeholder}/>{items.map(item=><SelectItem key={item.value} value={item.value} text={item.text} disabled={item.disabled}/>)}
 </CarbonSelect>;
}
export type NumberInputProps = Omit<CarbonNumberInputProps,"id"|"label"|"helperText"|"invalid"|"invalidText"> & SharedFieldProps;
export function NumberInput({id,labelText,helperText,invalid=false,invalidText,...props}:NumberInputProps) {
 return <CarbonNumberInput {...props} id={id} label={labelText} helperText={helperText} invalid={invalid} invalidText={invalidText}/>;
}