import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, ClipboardList, Check, ChevronDown } from 'lucide-react';
import { cn, formatPhone, phoneDigitsOnly, PHONE_LENGTH } from '../../lib/utils';
import { BRANCHES } from '../../constants/branches';
import { Field, TextInput, Select } from '..';

export function QuickOrderSetupPanel({ state, dispatch, forceExpand = false, branches = BRANCHES }) {
  const effectiveBranches = Array.isArray(branches) && branches.length ? branches : BRANCHES;
  const complete = Boolean(
    state.companyName.trim() &&
    state.branch &&
    state.supervisorName.trim() &&
    state.supervisorPhone.length === PHONE_LENGTH
  );

  const [isExpandedLocal, setIsExpandedLocal] = useState(!complete);
  const prevCompleteRef = useRef(complete);

  useEffect(() => {
    if (complete && !prevCompleteRef.current) {
      setIsExpandedLocal(false);
    } else if (!complete && prevCompleteRef.current) {
      setIsExpandedLocal(true);
    }
    prevCompleteRef.current = complete;
  }, [complete]);

  const isExpanded = forceExpand ? true : isExpandedLocal;

  return (
    <section
      data-section="contact-info"
      className={cn(
        'flex flex-col rounded-xl border bg-white p-4 sm:p-5 transition-all duration-300 shadow-sm w-full',
        complete
          ? 'border-green-200 bg-green-50/20'
          : 'border-2 border-yellow-300 bg-yellow-50/20 shadow-md'
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 select-none",
          !forceExpand && "cursor-pointer"
        )}
        onClick={() => !forceExpand && setIsExpandedLocal(!isExpandedLocal)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-base font-black text-[#071638]">
              <ClipboardList className="size-4 text-[#0A2A5E]" />
              ข้อมูลผู้ติดต่อ / ผู้เบิก
            </h2>
            {complete ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#166534]">
                <Check className="size-3" /> ครบถ้วน
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800 animate-pulse">
                <AlertTriangle className="size-3" /> ยังไม่ครบ
              </span>
            )}
          </div>
          {!isExpanded && complete && (
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#64748B] truncate">
              {state.companyName} ({state.branch}) · คุณ{state.supervisorName} ({formatPhone(state.supervisorPhone)})
            </p>
          )}
          {isExpanded && (
            <p className="mt-1.5 text-[13px] font-semibold leading-5 text-[#52525B]">
              {complete
                ? 'ข้อมูลผู้เบิกครบแล้ว สามารถกดซ่อนเพื่อประหยัดพื้นที่หน้าจอ'
                : 'กรุณากรอกข้อมูลให้ครบทั้ง 4 ช่อง เพื่อเตรียมการจัดส่ง'}
            </p>
          )}
        </div>
        {!forceExpand && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 text-xs font-black text-[#002B5B] transition shrink-0"
          >
            <span>{isExpanded ? 'ย่อไว้' : 'แก้ไขข้อมูล'}</span>
            <ChevronDown className={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:[&>*]:min-w-0 mt-4 border-t border-neutral-100 pt-4">
          <Field label="บริษัท / หน่วยงาน *">
            <TextInput
              id="setup-company-name"
              value={state.companyName}
              onChange={(value) => dispatch({ type: 'patchBatch', patch: { companyName: value } })}
              placeholder="ชื่อบริษัท / สำนักงาน"
              title="ระบุชื่อบริษัทหรือหน่วยงานของคุณ"
            />
          </Field>
          <Field label="สาขาที่จัดส่ง *">
            <Select
              id="setup-branch"
              value={state.branch}
              onChange={(value) => dispatch({ type: 'patchBatch', patch: { branch: value } })}
              values={effectiveBranches}
              placeholder="เลือกสาขา"
            />
          </Field>
          <Field label="ชื่อผู้รับผิดชอบ *">
            <TextInput
              id="setup-supervisor-name"
              value={state.supervisorName}
              onChange={(value) => dispatch({ type: 'patchBatch', patch: { supervisorName: value } })}
              placeholder="ชื่อ-นามสกุล"
              title="ชื่อบุคคลที่เป็นผู้รับผิดชอบสั่งซื้อเสื้อ"
            />
          </Field>
          <Field label="เบอร์ติดต่อ *">
            <TextInput
              id="setup-supervisor-phone"
              value={state.supervisorPhone}
              onChange={(value) =>
                dispatch({ type: 'patchBatch', patch: { supervisorPhone: phoneDigitsOnly(value) } })
              }
              placeholder="08X-XXX-XXXX"
              inputMode="numeric"
              pattern="[0-9]*"
              title="เบอร์โทรศัพท์มือถือ 10 หลัก"
            />
          </Field>
        </div>
      )}
    </section>
  );
}
