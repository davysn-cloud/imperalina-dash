"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Orcamento, OrcamentoTemplate } from "@/lib/types"

interface MinimalistaTemplateProps {
  orcamento: Orcamento
  template?: OrcamentoTemplate
  preview?: boolean
}

export function MinimalistaTemplate({ orcamento, template, preview = false }: MinimalistaTemplateProps) {
  const corPrimaria = template?.cor_primaria || "#000000"
  const corSecundaria = template?.cor_secundaria || "#666666"

  return (
    <div className={`bg-white ${preview ? 'p-8' : 'p-12'} font-light text-gray-900 min-h-full`}>
      {/* Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-light tracking-wide mb-2" style={{ color: corPrimaria }}>
              ORÇAMENTO
            </h1>
            <p className="text-sm uppercase tracking-widest text-gray-500">
              {orcamento.numero}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm uppercase tracking-wide text-gray-500 mb-1">
              DATA DE EMISSÃO
            </div>
            <div className="font-normal">
              {format(new Date(orcamento.data_emissao), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          </div>
        </div>
      </div>

      {/* Dados da Empresa e Cliente */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-4 border-b border-gray-100 pb-2">
            DE
          </h3>
          <div className="space-y-1 text-sm">
            <div className="font-medium">Imperalina Estética</div>
            <div>contato@imperalina.com</div>
            <div>(11) 99999-9999</div>
            <div>São Paulo, SP</div>
          </div>
        </div>
        <div>
          <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-4 border-b border-gray-100 pb-2">
            PARA
          </h3>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{orcamento.cliente.nome}</div>
            <div>{orcamento.cliente.email}</div>
            <div>{orcamento.cliente.telefone}</div>
          </div>
        </div>
      </div>

      {/* Tabela de Itens */}
      <div className="mb-12">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-6 border-b border-gray-100 pb-2">
          SERVIÇOS
        </h3>
        <div className="border border-gray-200">
          {/* Header da tabela */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-600">
            <div className="col-span-5">Descrição</div>
            <div className="col-span-2 text-center">Quantidade</div>
            <div className="col-span-2 text-right">Valor Unit.</div>
            <div className="col-span-1 text-right">Desc.</div>
            <div className="col-span-2 text-right">Subtotal</div>
          </div>
          
          {/* Itens */}
          {orcamento.itens.map((item, index) => (
            <div 
              key={index} 
              className={`grid grid-cols-12 gap-4 p-4 border-b border-gray-100 text-sm ${
                index % 2 === 1 ? 'bg-gray-25' : ''
              }`}
            >
              <div className="col-span-5 font-medium">{item.servico_nome}</div>
              <div className="col-span-2 text-center">{item.quantidade}</div>
              <div className="col-span-2 text-right">
                {item.valor_unitario.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                })}
              </div>
              <div className="col-span-1 text-right">
                {item.desconto > 0 ? `${item.desconto}%` : '-'}
              </div>
              <div className="col-span-2 text-right font-medium">
                {item.subtotal.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totais */}
      <div className="flex justify-end mb-12">
        <div className="w-80 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="uppercase tracking-wide text-gray-500">Subtotal</span>
            <span>
              {orcamento.subtotal.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              })}
            </span>
          </div>
          {orcamento.desconto > 0 && (
            <div className="flex justify-between text-sm">
              <span className="uppercase tracking-wide text-gray-500">Desconto</span>
              <span>
                -{orcamento.desconto.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                })}
              </span>
            </div>
          )}
          <div 
            className="flex justify-between text-lg font-medium border-t border-gray-200 pt-3"
            style={{ color: corPrimaria }}
          >
            <span className="uppercase tracking-wide">Total</span>
            <span>
              {orcamento.valor_total.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Validade */}
      <div className="border-t border-gray-200 pt-8">
        <div className="text-center text-sm text-gray-500">
          <p className="uppercase tracking-wide mb-2">Validade da Proposta</p>
          <p className="font-medium">
            {format(new Date(orcamento.data_validade), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 uppercase tracking-widest">
        Imperalina Estética - Orçamento Gerado Automaticamente
      </div>
    </div>
  )
}