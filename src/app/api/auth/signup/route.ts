import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const SALT_ROUNDS = 12

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, senha, confirmarSenha, organizacao, novaOrganizacao } = body

    // ───────────────────────────────────────────────────────
    // Validações
    // ───────────────────────────────────────────────────────
    if (!nome || nome.trim().length < 3) {
      return NextResponse.json(
        { erro: 'Nome deve ter pelo menos 3 caracteres' },
        { status: 400 }
      )
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { erro: 'Email inválido' },
        { status: 400 }
      )
    }

    if (!senha || senha.length < 8) {
      return NextResponse.json(
        { erro: 'Senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      )
    }

    if (senha !== confirmarSenha) {
      return NextResponse.json(
        { erro: 'As senhas não conferem' },
        { status: 400 }
      )
    }

    // ───────────────────────────────────────────────────────
    // Determinar organização
    // ───────────────────────────────────────────────────────
    let organizacaoId: string

    if (novaOrganizacao) {
      // Criar nova organização
      if (!novaOrganizacao.nome || novaOrganizacao.nome.trim().length < 3) {
        return NextResponse.json(
          { erro: 'Nome da organização deve ter pelo menos 3 caracteres' },
          { status: 400 }
        )
      }

      // Gerar slug válido
      const slug = novaOrganizacao.nome
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      // Verificar se slug já existe
      const orgExistente = await prisma.organizacao.findUnique({
        where: { slug },
      })

      if (orgExistente) {
        return NextResponse.json(
          { erro: 'Este nome de organização já está registrado. Tente outro.' },
          { status: 400 }
        )
      }

      const org = await prisma.organizacao.create({
        data: {
          nome: novaOrganizacao.nome,
          slug,
        },
      })

      organizacaoId = org.id
    } else if (organizacao) {
      // Usar organização existente
      const org = await prisma.organizacao.findUnique({
        where: { slug: organizacao },
      })

      if (!org) {
        return NextResponse.json(
          { erro: 'Organização não encontrada' },
          { status: 400 }
        )
      }

      organizacaoId = org.id
    } else {
      return NextResponse.json(
        { erro: 'Selecione ou crie uma organização' },
        { status: 400 }
      )
    }

    // ───────────────────────────────────────────────────────
    // Verificar se usuário já existe
    // ───────────────────────────────────────────────────────
    const usuarioExistente = await prisma.usuario.findUnique({
      where: {
        email_organizacaoId: { email, organizacaoId },
      },
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { erro: 'Email já registrado nesta organização' },
        { status: 400 }
      )
    }

    // ───────────────────────────────────────────────────────
    // Criptografar senha e criar usuário
    // ───────────────────────────────────────────────────────
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS)

    const usuario = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha: senhaHash,
        role: 'OPERACIONAL', // Role padrão para novo usuário
        organizacaoId,
        ativo: true,
      },
      include: {
        organizacao: true,
      },
    })

    // ───────────────────────────────────────────────────────
    // Retornar sucesso (sem expor a senha)
    // ───────────────────────────────────────────────────────
    return NextResponse.json(
      {
        mensagem: 'Cadastro realizado com sucesso!',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          organizacao: usuario.organizacao.nome,
          organizacaoSlug: usuario.organizacao.slug,
        },
      },
      { status: 201 }
    )
  } catch (erro) {
    console.error('Erro ao criar usuário:', erro)
    return NextResponse.json(
      { erro: 'Erro ao processar cadastro. Tente novamente.' },
      { status: 500 }
    )
  }
}
